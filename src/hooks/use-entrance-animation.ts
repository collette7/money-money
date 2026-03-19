import { useEffect, useState } from 'react'

export const TIMING = {
  heroFade: 0,
  statsStagger: 200,
  cardsStagger: 400,
  sectionReveal: 600,
}

export function useEntranceAnimation(delay = 0) {
  const [stage, setStage] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(1)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  return stage
}

export function useStaggeredEntrance(itemCount: number, baseDelay = 0, staggerDelay = 100) {
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, i])
      }, baseDelay + (i * staggerDelay))
      
      timers.push(timer)
    }
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [itemCount, baseDelay, staggerDelay])
  
  return visibleItems
}