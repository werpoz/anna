import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111b21] font-sans text-[#111b21] dark:text-[#e9edef]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center text-white">
            <svg viewBox="0 0 33 33" width="18" height="18" fill="currentColor"><path d="M16.6 2c-8 0-14.5 6.5-14.5 14.5 0 8 6.5 14.5 14.5 14.5 8 0 14.5-6.5 14.5-14.5C31.1 8.5 24.6 2 16.6 2zm0 25.5c-6.1 0-11-4.9-11-11s4.9-11 11-11 11 4.9 11 11-4.9 11-11 11z"></path></svg>
          </span>
          <span className="text-xl font-bold tracking-tight">Anna</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="hover:text-[#00a884] transition-colors">Features</Link>
          <Link href="#security" className="hover:text-[#00a884] transition-colors">Security</Link>
          <Link href="/login" className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white transition-all shadow-sm">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative overflow-hidden pt-20 pb-32">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -z-10 opacity-10 dark:opacity-5">
          <svg width="800" height="800" viewBox="0 0 500 500"><circle cx="400" cy="100" r="400" fill="#00a884" /></svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d9fdd3] dark:bg-[#005c4b] text-[#00a884] dark:text-[#e9edef] text-xs font-bold uppercase tracking-wide">
              New Release v2.0
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              WhatsApp Infrastructure for <span className="text-[#00a884]">Modern Business</span>
            </h1>
            <p className="text-xl text-[#54656f] dark:text-[#aebac1] max-w-lg leading-relaxed">
              Manage millions of sessions securely without a phone. The enterprise-grade solution for high-scale WhatsApp automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/login" className="px-8 py-4 rounded-full bg-[#111b21] dark:bg-[#00a884] text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                Get Started
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path></svg>
              </Link>
              <Link href="#documentation" className="px-8 py-4 rounded-full border border-[#d1d7db] dark:border-[#2a3942] font-semibold text-lg hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-all flex items-center justify-center">
                View Documentation
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#54656f] dark:text-[#8696a0] pt-4">
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5 text-[#00a884]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-5 h-5 text-[#00a884]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span>End-to-End Encrypted</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Mockup */}
          <div className="relative">
            <div className="relative z-10 bg-[var(--wa-panel-bg)] rounded-xl shadow-2xl border border-[var(--wa-panel-border)] p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4 p-2 border-b border-[var(--wa-panel-border)]">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 h-4 w-64 bg-[var(--wa-input-bg)] rounded-md"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-[var(--wa-input-bg)] rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-2 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="text-xs text-[#00a884]">12:4{i} PM</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative floating elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#25D366]/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#f0f2f5] dark:bg-[#0b141a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-[#54656f] dark:text-[#aebac1]">
              Powerful features designed for reliability, scalability, and ease of use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Multi-Device", desc: "Connect up to 4 devices seamlessly." },
              { title: "Real-time API", desc: "WebSocket events for every message." },
              { title: "Media Support", desc: "Send images, videos, and documents." },
              { title: "Secure Storage", desc: "HttpOnly cookies & encryption." },
              { title: "Analytics", desc: "Track delivery and read receipts." },
              { title: "Auto-Reply", desc: "Configure simplistic bot responses." }
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-[#111b21] p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#d9fdd3] dark:bg-[#005c4b] rounded-xl flex items-center justify-center text-[#00a884] dark:text-white mb-6">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#54656f] dark:text-[#aebac1] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111b21] text-[#aebac1] py-12 border-t border-[#222d34]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-white font-bold text-2xl tracking-tight">Anna</span>
            <p className="mt-4 max-w-xs text-sm">
              The infrastructure layer for WhatsApp automation. Built for developers, by developers.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Features</a></li>
              <li><a href="#" className="hover:text-white">Security</a></li>
              <li><a href="#" className="hover:text-white">Enterprise</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">API Reference</a></li>
              <li><a href="#" className="hover:text-white">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-[#222d34] text-center md:text-left text-sm">
          &copy; 2026 Anna Sessions Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
