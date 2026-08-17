"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function VintedConnectModal({ onClose, redirectTo = '/vinted-dashboard' }: { onClose?: () => void; redirectTo?: string }) {
  const [open, setOpen] = useState(true)
  const [username, setUsername] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [cookieJar, setCookieJar] = useState('')
  const [loading, setLoading] = useState(false)
  const [browserLoading, setBrowserLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch('/api/vinted/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, profileUrl, cookieJar }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setOpen(false)
      onClose && onClose()
      window.location.href = redirectTo
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  async function connectWithBrowser() {
    setBrowserLoading(true)
    try {
      const res = await fetch('/api/vinted/login/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setOpen(false)
      onClose && onClose()
      window.location.href = redirectTo
    } catch (err: any) {
      alert(err.message || 'Erreur lors du login via navigateur')
    } finally {
      setBrowserLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="panel-strong w-full max-w-2xl p-8 text-white shadow-[0_35px_120px_-30px_rgba(15,23,42,0.8)]"
          >
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold">Connectez votre compte Vinted</h3>
                <p className="text-sm text-slate-300">Connectez-vous via votre navigateur en toute sécurité. Nous n'enregistrons jamais votre mot de passe : seuls les cookies de session sont capturés et chiffrés.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="panel panel-hover p-5">
                  <p className="text-sm text-slate-400">Connexion rapide</p>
                  <p className="mt-2 text-lg font-semibold">Ouvrez un navigateur, connectez-vous à Vinted, et la session sera capturée automatiquement.</p>
                </div>
                <div className="panel panel-hover p-5">
                  <p className="text-sm text-slate-400">Sécurisé</p>
                  <p className="mt-2 text-lg font-semibold">Cookies chiffrés avec votre clé secrète, sans stockage de mot de passe.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={connectWithBrowser} className="btn-shine w-full sm:w-auto" disabled={browserLoading}>
                  {browserLoading ? 'Ouverture du navigateur...' : 'Connexion via navigateur'}
                </Button>
                <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full sm:w-auto">
                  {showAdvanced ? 'Masquer l\'option avancée' : 'Connexion avancée'}
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="panel p-5">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-300">Pseudo (optionnel)</label>
                          <input className="input-field w-full bg-slate-950 text-white border-slate-800" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-300">URL du profil (optionnel)</label>
                          <input className="input-field w-full bg-slate-950 text-white border-slate-800" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-300">Cookie Jar (JSON)</label>
                          <textarea className="input-field w-full h-28 bg-slate-950 text-white border-slate-800" value={cookieJar} onChange={(e) => setCookieJar(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={submit} disabled={loading}>{loading ? 'Connexion...' : 'Valider manuellement'}</Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); onClose && onClose() }}>Annuler</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
