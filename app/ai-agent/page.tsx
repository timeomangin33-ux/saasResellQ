'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Send, RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { normalizePlan } from '@/lib/plans'

interface Message {
  id: string
  role: 'user' | 'assistant', content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

const SUGGESTIONS = [
  'Quels sont les meilleurs produits à revendre cette semaine ?',
  'Analyse le marché des sneakers Nike',
  'Trouve des opportunités avec une marge supérieure à 40%',
  'Quelles catégories sont en croissance ?',
]

export default function AIAgentPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '0',
      title: 'Briefing du matin',
      messages: [
        {
          id: '0',
          role: 'assistant',
          content: 'Bonjour. Je suis votre assistant d\'analyse de marché Vinted. Posez-moi une question sur les produits, les tendances ou les opportunités de revente.',
          timestamp: new Date(),
        },
      ],
    },
    { id: '1', title: 'Deals Nike', messages: [] },
    { id: '2', title: 'Watchlist rapide', messages: [] },
  ])
  const [activeConversationId, setActiveConversationId] = useState('0')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<{ remaining: number; limit: number; planLabel: string; plan: string; active: boolean } | null>(null)
  const [usageError, setUsageError] = useState('')
  const [sessionId] = useState<string>(() => `sess_${(typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2)}`)
  const idCounter = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? conversations[0]
  const messages = activeConversation.messages
  const isAIAccessible = !!usage?.active && (usage.remaining ?? 0) > 0
  const planKey = normalizePlan(usage?.plan)
  const planDescription = planKey === 'BUSINESS'
    ? 'Assistant IA complet, support prioritaire et intégration Business.'
    : planKey === 'PRO'
      ? 'IA avancée pour vos analyses, rapports et actions marché.'
      : 'Assistant Starter pour des conseils rapides et un premier pilotage.'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const response = await fetch('/api/ai/usage')
        const data = response.ok ? await response.json().catch(() => null) : null
        if (!response.ok || !data) throw new Error('Impossible de charger l’usage IA.')
        setUsage(data)
      } catch {
        setUsageError('Le statut IA n’a pas pu être chargé. Réessayez dans un instant.')
      }
    }
    void loadUsage()
  }, [])

  const updateConversation = (update: (conversation: Conversation) => Conversation) => {
    setConversations(prev => prev.map(conversation =>
      conversation.id === activeConversationId ? update(conversation) : conversation
    ))
  }

  const send = async (text?: string) => {
    const message = (text || input).trim()
    const isAvailable = !!usage?.active && (usage.remaining ?? 0) > 0
    if (!message || loading || !isAvailable) return

    const userMsg: Message = { id: String(idCounter.current++), role: 'user', content: message, timestamp: new Date() }
    updateConversation(conversation => ({ ...conversation, messages: [...conversation.messages, userMsg] }))
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      if (data.usage) setUsage(current => current ? { ...current, remaining: data.usage.remaining, limit: data.usage.limit } : current)
      const assistantMsg: Message = {
        id: String(idCounter.current++),
        role: 'assistant',
        content: data.result || 'Aucune réponse disponible.',
        timestamp: new Date(),
      }
      updateConversation(conversation => ({ ...conversation, messages: [...conversation.messages, assistantMsg] }))
    } catch (error) {
      const assistantMsg: Message = {
        id: String(idCounter.current++),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Une erreur est survenue.',
        timestamp: new Date(),
      }
      updateConversation(conversation => ({ ...conversation, messages: [...conversation.messages, assistantMsg] }))
    } finally {
      setLoading(false)
    }
  }

  const newConversation = () => {
    const id = String(idCounter.current++)
    const conversation: Conversation = {
      id,
      title: `Conversation ${conversations.length + 1}`,
      messages: [
        {
          id: `${id}-0`,
          role: 'assistant',
          content: 'Nouvelle conversation démarrée. Comment puis-je vous aider ?',
          timestamp: new Date(),
        },
      ],
    }
    setConversations(prev => [...prev, conversation])
    setActiveConversationId(id)
    setInput('')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-65px)] bg-background">
        <div className="space-y-4 px-6 py-4 border-b border-border/50 md:flex md:items-end md:justify-between md:space-y-0">
          <div>
            <h1 className="text-lg font-semibold">Assistant IA</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Analyse de marché Vinted — assistant IA intégrée</p>
          </div>
          <button onClick={newConversation} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/50 hover:border-border transition">
            <RotateCcw className="w-3.5 h-3.5" />
            Nouvelle conversation
          </button>
        </div>

        <div className="grid gap-3 px-6 py-4 md:grid-cols-[1.2fr_0.8fr] border-b border-border/50">
          <div className="rounded-3xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">État du plan</p>
                <p className="mt-2 text-sm font-semibold text-white">{usage?.planLabel ?? 'Chargement...'}</p>
              </div>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
                {planKey === 'BUSINESS' ? 'Business' : planKey === 'PRO' ? 'Pro' : 'Starter'}
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">{planDescription}</p>
          </div>
          <div className="rounded-3xl border border-border/50 bg-card p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Conseils rapides</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>• Demandez une analyse segmentée par marque ou catégorie.</li>
              <li>• Vérifiez les opportunités à marge élevée.</li>
              <li>• Utilisez l’IA pour générer des rapports rapides.</li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">{usage?.active ? 'Votre plan est actif.' : 'Activez votre abonnement pour utiliser l’IA.'}</p>
          </div>
        </div>

        <div className="border-b border-border/50 px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`text-xs rounded-full px-3 py-2 transition ${conv.id === activeConversationId ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted/70'}`}>
                {conv.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {usageError ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">{usageError}</div>
          ) : null}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border/50 text-foreground rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[11px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} disabled={!isAIAccessible}
                  className={`text-left text-xs px-4 py-3 rounded-xl border border-border/50 bg-card transition ${!isAIAccessible ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground'}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-border/50">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={usage ? (!usage.active ? 'Abonnement inactif — activez votre forfait.' : usage.remaining <= 0 ? 'Crédits IA épuisés — renouvelez votre plan.' : 'Posez une question sur le marché Vinted...') : 'Chargement du plan...'}
              className="flex-1 px-4 py-3 rounded-xl bg-card border border-border/50 focus:border-primary/50 outline-none text-sm placeholder:text-muted-foreground"
              disabled={loading || !isAIAccessible}
            />
            <button onClick={() => send()} disabled={loading || !input.trim() || !isAIAccessible}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
