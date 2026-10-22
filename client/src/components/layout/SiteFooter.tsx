import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import {
  addressLines,
  HOURS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PHONE_DISPLAY,
} from "@shared/content/site";
import { navLinks } from "./SiteHeader";

const LINK = "hover:text-background transition-colors duration-300";

export function SiteFooter({ extraLinks = [] }: { extraLinks?: { label: string; href: string }[] }) {
  const links = [...navLinks(), ...extraLinks];
  const [addressLine1, addressLine2] = addressLines();

  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 lg:py-16">
        <img src="/brand/assinatura-bege.png" alt="Estúdio Pedra Industrial" className="mb-10 w-[150px] h-auto" />

        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h4 className="lbl mb-5 text-background">Navegação</h4>
            <ul className="space-y-3 text-sm text-brand-concrete">
              {links.map((l) => (
                <li key={l.href + l.label}>
                  <a href={l.href} className={LINK}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="lbl mb-5 text-background">Contato</h4>
            <ul className="space-y-3 text-sm text-brand-concrete">
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK} inline-flex items-center gap-2`}
                >
                  <InstagramIcon className="h-4 w-4" />
                  {INSTAGRAM_HANDLE}
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                {addressLine1}
                <br />
                {addressLine2}
              </li>
            </ul>
          </div>
          <div>
            <h4 className="lbl mb-5 text-background">Horário</h4>
            <ul className="space-y-3 text-sm text-brand-concrete">
              {HOURS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-concrete/30 pt-6 text-sm text-brand-concrete">
          <p>&copy; 2026 Estúdio Pedra Industrial. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
