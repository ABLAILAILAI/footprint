import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <span className="footer-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="footer-name">footprint</span>
        </div>
        <p className="footer-tagline">
          Your year in review, built entirely from data you already own.
          <br />
          Nothing ever leaves your device.
        </p>
        <a
          className="footer-link"
          href="https://github.com/ABLAILAILAI/footprint"
          target="_blank"
          rel="noreferrer"
        >
          View source on GitHub
        </a>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          ©2026 Footprint
          <br />
          Built as a CS 124 independent project.
        </p>
      </div>

      <div className="footer-wordmark" aria-hidden="true">
        Footprint
      </div>
    </footer>
  )
}

export default Footer
