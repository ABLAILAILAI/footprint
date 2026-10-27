import './Hero.css'

function Hero() {
  return (
    <header className="hero">
      <span className="hero-pill">
        <span className="hero-pill-dot" aria-hidden="true" />
        Your data, your story
      </span>

      <h1 className="hero-headline">
        <span className="hero-line hero-line-1">Your year,</span>
        <span className="hero-line hero-line-2">already yours.</span>
      </h1>

      <p className="hero-paragraph">
        Drag in your real exports, or try it with sample data first.
        Everything runs in your browser — nothing is ever uploaded.
      </p>

      <a className="hero-cta" href="#import">
        Get started
      </a>
    </header>
  )
}

export default Hero
