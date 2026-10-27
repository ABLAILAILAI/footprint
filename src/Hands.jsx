import { useEffect, useRef } from 'react'
import handsImage from './assets/hands.webp'
import './Hands.css'

// The full "Creation of Adam" fresco (Sistine Chapel, c. 1512), in its real,
// correctly aligned composition — public domain (PD-Art / CC-PD-Mark) per its
// Wikimedia Commons file page:
// https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg
// A soft alpha vignette is baked into the image so it blends into the page background.

function Hands() {
  const imageRef = useRef(null)

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const RANGE_PX = 18

    function handleMove(event) {
      const pct = Math.min(1, Math.max(0, event.clientX / window.innerWidth))
      image.style.transform = `translateX(${(pct - 0.5) * RANGE_PX}px)`
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <div className="hands-wrap" aria-hidden="true">
      <img src={handsImage} alt="" className="hands-image" ref={imageRef} />
      <div className="hands-scrim" />
    </div>
  )
}

export default Hands
