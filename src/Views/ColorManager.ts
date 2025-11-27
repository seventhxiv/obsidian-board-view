type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;

export interface LightDarkColor {
    light: RGB | RGBA;
    dark: RGB | RGBA;
}

export class ColorManager {
    public static readonly COLOR_MAP: Record<string, LightDarkColor> = {
        grey: {
            light: "rgb(151, 151, 151)",
            dark: "rgb(99, 98, 93)"
        },
        purple: {
            light: "rgb(138, 92, 245)",
            dark: "rgb(107, 78, 129)"
        },
        brown: {
            light: "rgb(139, 69, 19)",
            dark: "rgba(122, 78, 44, 1)"
        },
        blue: {
            light: "rgb(0, 128, 213)",
            dark: "rgb(52, 97, 145)"
        },
        green: {
            light: "rgb(33, 148, 94)",
            dark: "rgb(55, 107, 78)"
        },
        yellow: {
            light: "rgb(200, 180, 80)",
            dark: "rgba(158, 122, 43, 1)"
        },
        red: {
            light: "rgb(214, 74, 64)",
            dark: "rgb(150, 74, 69)"
        }
    };

    static apply(
        el: HTMLElement,
        name: keyof typeof ColorManager.COLOR_MAP,
        channel = "c"
    ) {
        const color = this.COLOR_MAP[name];

        if (!color) {
            console.warn(`[ColorManager] Unknown color: ${name}`);
            return;
        }

        el.classList.add("has-plugin-color");

        el.style.setProperty(`--${channel}-light`, color.light);
        el.style.setProperty(`--${channel}-dark`, color.dark);
    }

    static applyBorderLine(
        el: HTMLElement,
        name: string,
        channel = "c"
    ) {
        const color = this.COLOR_MAP[name];

        if (!color) {
            console.warn(`[ColorManager] Unknown color: ${name}`);
            return;
        }

        el.classList.add("has-plugin-color-border");

        el.style.setProperty(`--${channel}-light`, color.light);
        el.style.setProperty(`--${channel}-dark`, color.dark);
    }

    static applyCustom(
        el: HTMLElement,
        color: LightDarkColor,
        channel = "c"
    ) {
        el.classList.add("has-plugin-color");

        el.style.setProperty(`--${channel}-light`, color.light);
        el.style.setProperty(`--${channel}-dark`, color.dark);
    }

    static toRGBA(rgb: RGB, alpha: number): string {
        const match = rgb.match(/\d+/g);

        if (!match || match.length < 3) {
            throw new Error(`[ColorManager] Invalid RGB value: ${rgb}`);
        }

        const [r, g, b] = match.map(Number);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    static getColorNames(): string[] {
        return Object.keys(this.COLOR_MAP);
    }
}
