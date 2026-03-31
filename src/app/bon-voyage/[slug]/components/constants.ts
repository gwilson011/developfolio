// Map of country codes to flag emoji or image paths
export const FLAGS: Record<string, string> = {
    AT: "/bonvoyage/flags/at.png", // Austria
    US: "/bonvoyage/flags/us.png",
    FR: "/bonvoyage/flags/fr.png",
    IT: "/bonvoyage/flags/it.png",
    DE: "/bonvoyage/flags/de.png",
    ES: "/bonvoyage/flags/es.png",
    UK: "/bonvoyage/flags/uk.png",
    JP: "/bonvoyage/flags/jp.png",
};

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
}
