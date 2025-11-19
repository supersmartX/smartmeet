export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="py-8 sm:py-10 text-sm text-black/60 dark:text-white/60" role="contentinfo">
      <div className="container">
        <div className="flex flex-col items-center gap-4 sm:gap-3 sm:flex-row sm:justify-between">
          <p className="text-center sm:text-left">
            <span aria-label="Copyright">©</span> {currentYear} <span aria-label="Supersmarx company name">SupersmartX</span>
          </p>
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-3 sm:gap-4">
              <li>
                <a href="#" className="hover:underline transition-colors" aria-label="Privacy Policy">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline transition-colors" aria-label="Terms of Service">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline transition-colors" aria-label="Contact Us">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
