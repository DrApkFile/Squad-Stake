import { AppIcon } from './AppIcon';
import { Logo } from './Logo';
import { LogoMark } from './LogoMark';
import type { BrandTone } from './tone';

export interface BrandSheetProps {
  title: string;
  note: string;
  /** Which drawing this sheet proves: the lockup, the mark at every size it is used at, or
   * the square app icon. */
  kind: 'logo' | 'mark' | 'icon';
  demoLabel?: string | undefined;
}

interface Band { id: string; label: string; tone: BrandTone }

/** The four variants, each on the background it is for. A variant is only honest on its own
 * background: the full-colour mark's gold would vanish into the warm hero, which is exactly
 * what the single-colour white variant exists to solve. */
const BANDS: readonly Band[] = [
  { id: 'dark', label: 'Full colour · on the dark sheet', tone: 'colour-dark' },
  { id: 'light', label: 'Full colour · on white', tone: 'colour-light' },
  { id: 'warm', label: 'One colour white · on the warm hero', tone: 'white' },
  { id: 'paper', label: 'One colour navy · on paper', tone: 'navy' },
];

const MARK_SIZES = [256, 64, 32, 16] as const;
const LOGO_HEIGHTS = [48, 28, 18] as const;
const ICON_SIZES = [120, 64, 32, 16] as const;

/** A proof sheet for the brand, rendered by the same components the app and the video use. */
export function BrandSheet({ title, note, kind, demoLabel }: BrandSheetProps) {
  return (
    <main className="mark-sheet">
      {demoLabel !== undefined && <p className="demo-label">{demoLabel}</p>}
      <h1 className="mark-sheet-name">{title}</h1>
      <p className="mark-sheet-idea">{note}</p>
      {BANDS.map((band) => (
        <section key={band.id} className="mark-band" data-band={band.id}>
          <p className="mark-band-label">{band.label}</p>
          <div className="mark-band-row">
            {kind === 'mark' && MARK_SIZES.map((size) => (
              <span className="mark-slot" key={size} style={{ '--slot': `${size}px` } as never}>
                <LogoMark size={size} tone={band.tone} id={`${band.id}-${size}`} title={null} />
                <span className="mark-slot-size">{size}</span>
              </span>
            ))}
            {kind === 'logo' && LOGO_HEIGHTS.map((height) => (
              <span className="mark-slot" key={height} style={{ '--slot': 'auto' } as never}>
                <Logo size={height} tone={band.tone} id={`${band.id}-${height}`} title={null} />
                <span className="mark-slot-size">{height}</span>
              </span>
            ))}
            {/* The icon has one fixed treatment, so the band's tone does not apply to it: the
                four rows show it on four backgrounds instead, which is what a launcher does. */}
            {kind === 'icon' && ICON_SIZES.map((size) => (
              <span className="mark-slot" key={size} style={{ '--slot': `${size}px` } as never}>
                <AppIcon size={size} id={`${band.id}-${size}`} title={null} className="app-icon" />
                <span className="mark-slot-size">{size}</span>
              </span>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
