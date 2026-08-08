import React from 'react'

type MotionComponents = {
  [key: string]: any
}

const motionCache = new Map<string, any>()

export const motion = new Proxy({} as MotionComponents, {
  get: (_target, prop: string) => {
    if (motionCache.has(prop)) return motionCache.get(prop)
    const Comp = ({ children, ...props }: any) => React.createElement(prop as any, props, children)
    motionCache.set(prop, Comp)
    return Comp
  },
})
