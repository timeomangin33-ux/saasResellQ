import { prisma } from '../prisma'
import { saveVintedSession, getVintedAccountForUser, persistFetchedData, computeSummary } from '../lib/vinted-connector'
import play from '../lib/playwright-vinted'

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
  if (!user) throw new Error('Test user not found')

  const user2 = await prisma.user.upsert({
    where: { email: 'second@example.com' },
    update: {},
    create: {
      email: 'second@example.com',
      name: 'Second User',
      password: 'unused',
      role: 'USER',
      subscriptionStatus: 'INACTIVE',
    },
  })

  const fakeCookieJar = JSON.stringify([
    {
      name: '_vinted_session',
      value: 'fake-cookie-value',
      domain: '.vinted.fr',
      path: '/',
      httpOnly: true,
      secure: true,
    },
  ])

  const account = await saveVintedSession(user.id, {
    username: 'testuser',
    profileUrl: 'https://www.vinted.fr/member/testuser',
    cookieJar: fakeCookieJar,
  })

  console.log('Saved Vinted account:', { id: account.id, userId: account.userId })

  if (!account.cookieJar || account.cookieJar === fakeCookieJar) {
    throw new Error('cookieJar must be encrypted before saving')
  }

  const decrypted = play.decryptCookieJar(account.cookieJar)
  if (decrypted !== fakeCookieJar) {
    throw new Error('Decrypted cookie jar does not match original')
  }

  const accountAgain = await getVintedAccountForUser(user.id)
  if (!accountAgain || accountAgain.id !== account.id) {
    throw new Error('Failed to fetch saved Vinted account by userId')
  }

  console.log('Fetched Vinted account again:', { id: accountAgain.id })

  const listings = [
    { vintedId: 'listing-1', title: 'Test Listing 1', price: 20.5, currency: 'EUR', category: 'Women', brand: 'Zara', sold: false },
    { vintedId: 'listing-2', title: 'Test Listing 2', price: 45.0, currency: 'EUR', category: 'Homme', brand: 'Nike', sold: true, soldAt: new Date() },
  ]

  const sales = [
    { listingId: 'listing-2', price: 45.0, currency: 'EUR', soldAt: new Date() },
  ]

  await persistFetchedData(account.id, listings, sales)

  const accountListingCount = await prisma.vintedListing.count({ where: { accountId: account.id } })
  const accountSaleCount = await prisma.vintedSale.count({ where: { accountId: account.id } })
  const syncCount = await prisma.vintedSync.count({ where: { accountId: account.id } })

  if (accountListingCount !== listings.length) {
    throw new Error(`Expected ${listings.length} listings, got ${accountListingCount}`)
  }
  if (accountSaleCount !== sales.length) {
    throw new Error(`Expected ${sales.length} sales, got ${accountSaleCount}`)
  }
  if (syncCount < 1) {
    throw new Error('Expected at least one VintedSync record')
  }

  console.log('Persisted listings/sales/sync records successfully')

  const summary = computeSummary(listings, sales)
  console.log('Computed summary:', summary)

  const user2Account = await saveVintedSession(user2.id, {
    username: 'otheruser',
    profileUrl: 'https://www.vinted.fr/member/otheruser',
    cookieJar: fakeCookieJar,
  })
  console.log('Saved second Vinted account for separate user:', { id: user2Account.id })

  const firstUserAccountCount = await prisma.vintedAccount.count({ where: { userId: user.id } })
  const secondUserAccountCount = await prisma.vintedAccount.count({ where: { userId: user2.id } })

  if (firstUserAccountCount < 1 || secondUserAccountCount < 1) {
    throw new Error('Expected Vinted accounts for both users')
  }

  console.log('Verified user-scoped Vinted accounts exist for both users')

  process.exit(0)
}

main().catch((error) => {
  console.error('Verification failed:', error)
  process.exit(1)
})
