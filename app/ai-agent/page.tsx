'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, Sparkles, Bot, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { normalizePlan } from '@/lib/plans'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
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

function newId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

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
  ])
  const [activeConversationId, setActiveConversationId] = useState('0')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<{ remaining: number; limit: number; planLabel: string; plan: string; active: boolean } | null>(null)
  const [usageError, setUsageError] = useState('')
  const [sessionId] = useState<string>(() => `sess_${newId()}`)
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
        if (!response.ok || !data) throw new Error('Impossible de charger l\'usage IA.')
        setUsage(data)
      } catch {
        setUsageError('Le statut IA n\'a pas pu être chargé. Réessayez dans un instant.')
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

    const userMsg: Message = { id: newId(), role: 'user', content: message, timestamp: new Date() }
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
        id: newId(),
        role: 'assistant',
        content: data.result || 'Aucune réponse disponible.',
        timestamp: new Date(),
      }
      updateConversation(conversation => ({ ...conversation, messages: [...conversation.messages, assistantMsg] }))
    } catch (error) {
      const assistantMsg: Message = {
        id: newId(),
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
    const id = newId()
    const conversation: Conversation = {
      id,
      title: `Conversation ${conversations.length + 1}`,
      messages: [
        {
          id: newId(),
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
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Bot className="h-5 w-5 text-emerald-300" />
              </motion.span>
              Assistant IA
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Analyse de marché Vinted — assistant IA intégré</p>
          </div>
          <Magnetic strength={0.2}>
            <button onClick={newConversation} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/50 hover:border-emerald-400/40 transition">
              <RotateCcw className="w-3.5 h-3.5" />
              Nouvelle conversation
            </button>
          </Magnetic>
        </div>

        <div className="grid gap-3 px-6 py-4 md:grid-cols-[1.2fr_0.8fr] border-b border-border/50">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel panel-hover p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">État du plan</p>
                  <p className="mt-2 text-sm font-semibold text-white">{usage?.planLabel ?? 'Chargement...'}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  {planKey === 'BUSINESS' ? 'Business' : planKey === 'PRO' ? 'Pro' : 'Starter'}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{planDescription}</p>
            </motion.div>
          </SpotlightCard>
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="panel panel-hover p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Conseils rapides</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>• Demandez une analyse segmentée par marque ou catégorie.</li>
                <li>• Vérifiez les opportunités à marge élevée.</li>
                <li>• Utilisez l'IA pour générer des rapports rapides.</li>
              </ul>
              <p className="mt-3 text-xs text-zinc-500">{usage?.active ? 'Votre plan est actif.' : 'Activez votre abonnement pour utiliser l\'IA.'}</p>
            </motion.div>
          </SpotlightCard>
        </div>

        {conversations.length > 1 && (
          <div className="border-b border-border/50 px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`text-xs rounded-full px-3 py-2 transition ${conv.id === activeConversationId ? 'bg-emerald-500 text-white' : 'bg-card text-muted-foreground hover:bg-muted/70'}`}>
                  {conv.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {usageError ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">{usageError}</div>
          ) : null}

          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/10 text-emerald-200">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className={`max-w-2xl ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white rounded-br-sm'
                      : 'bg-card border border-border/50 text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[11px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-white/10 text-zinc-300">
                    <User className="h-3.5 w-3.5" />
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex items-end gap-2 justify-start">
              <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/10 text-emerald-200">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  whileHover={isAIAccessible ? { y: -2 } : undefined}
                  onClick={() => send(s)}
                  disabled={!isAIAccessible}
                  className={`flex items-center gap-2 text-left text-xs px-4 py-3 rounded-xl border border-border/50 bg-card transition ${!isAIAccessible ? 'cursor-not-allowed opacity-50' : 'hover:border-emerald-400/40 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground'}`}
                >
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
                  {s}
                </motion.button>
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
              className="flex-1 px-4 py-3 rounded-xl bg-card border border-border/50 focus:border-emerald-400/50 outline-none text-sm placeholder:text-muted-foreground transition-colors"
              disabled={loading || !isAIAccessible}
            />
            <Magnetic strength={0.25}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => send()}
                disabled={loading || !input.trim() || !isAIAccessible}
                className="px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </Magnetic>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
