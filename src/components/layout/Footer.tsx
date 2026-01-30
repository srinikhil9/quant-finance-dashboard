import { Github, ExternalLink } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <span>Quantitative Finance Dashboard</span>
            <span className="mx-2">|</span>
            <span>Built with Next.js & Python</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="https://github.com/srinikhil9/quant-finance-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </Link>
            <Link
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Deployed on Vercel</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
