# Jednadvacet.org

Webová stránka a blog pro komunitu Jednadvacet.org.

## Technologický stack

Projekt plně využívá konvence frameworku Nuxt. Pro pochopení struktury složek a architektury nahlédni do oficiální dokumentace:

- [Nuxt 4](https://nuxt.com/docs) - Hlavní framework (Vue 3).
- [Nuxt Content](https://content.nuxt.com/) - Modul pro správu obsahu (Markdown soubory).
- [Nuxt UI](https://ui.nuxt.com/) - Knihovna UI komponent.
- Produkční prostředí běží na **Cloudflare Workers**.

## Správa obsahu

### Blog

- Články se ukládají do `content/blog-articles/` s názvy souborů ve formátu `YYYYMMDD.nazev-clanku.md`
- Články se píšou v jazyce zvaném Markdown, [zde je jednoduchý tutoriál](https://www.markdowntutorial.com/)
- Obrázky se ukládají do `public/blog/` s názvy souborů ve formátu `nazev-clanku-obrazek.jpg`
- V článku se zobruje datum zveřejnění článku, to se nastaví v názvu souboru. (Tedy musí být aktualizováno před schválením v pull requestu.)

### People

- Profily autorů článků, organizátorů apod. se ukládají do `content/people/` s názvy souborů ve formátu `jmeno.md`
- Avatary se ukládají do `public/people/` s názvy souborů ve formátu `jmeno.jpg` (čtverec min 512px)
- Odkaz na Nostr by měl začínat na `nprofile...` nebo `npub...` (tedy ne URL)

## Předpřipravený devcontainer

Visual Studio Code nebo GitHub Workspace umožňují použít devcontainer, který má předinstalované doporučené extensions a nastavení. Cokoliv v něm spustíš (nebo AI agent) tak bude izolováno od tvého systému pomocí Docker kontejneru (nechat AI se autonomně hrabat v tvém počítači je opravdu špatný nápad 😉).

Doporučený postup pro první spuštění (lokálně):

1. Nainstaluj si [VSCode](https://code.visualstudio.com).
2. Na Welcome screen vyber **Clone Git Repository** a zadej URL tohoto repozitáře.
3. V levém dolném rohu klikni na ikonku `><` a vyber Dev Container. Pokud to ještě nemáš, tak se nainstaluje extension, WSL (jen na Windows, potřebuje restart počítače) a Docker (na Windows pak potřebuje restart počítače) .
4. Přes stejnou ikonku pak vyber `Dev Containers: Reopen in Container`.
5. Po chvíli se obnoví VSCode
   - Chvili se bude instalovat devcontainer
   - Zobrazí se soubory projektu a je možné je editovat
   - Spustí se v terminálu instalace závislostí
   - Nakonec se spustí dev server, který v terminálu zobrazí URL kterou můžeš otevřít v prohlížeči

### OpenCode - AI agent

V pravém horním rohu je tlačítko `OpenCode` (nebo `Ctrl+Shift+P` a vybrat `OpenCode: Open`).

V základu můžeš zdarma používat základní modely (denní limit, stačí na jednodušší úkoly)

Nejlepší modely můžeš použít třeba přes [PPQ.ai](https://ppq.ai/invite/a586e70a) kde si nabíješ kredit (přes LN 10% sleva) a můžeš anonymně používat modely různých firem. Po nabítí kreditu si do souboru `.env` nastav svůj API klíč a restartuj devcontainer (`Ctrl+Shift+P` a vybrat `Dev Containers: Rebuild Container`).

## GIT workflow

- Pokud nemáš jasné zadání z existující Issue, tak jí nejdříve založ a zkonzultuj co a jak chceš udělat.
- Vždy začínáme z `master` větve, pak vytvoř svou novou větev se smysluplným názvem např. `feature/tankovani-paliva-na-orbite` nebo `fix/oprava-kavovaru`
- Vždy se snaž udělat co nejmenší commit po kterém to je funkční (nebo měj dobrý důvod proč zveřejnit jen draft).
- Vytvoř Pull request a popiš co jsi a proč udělal (většinou stačí odkaz na issue a předvyplněné commit message, pokud jsi je napsal smysluplně). Nezapomeň na označení Draft pokud to ještě není hotové ke schválení.

## Náhledové verze (review apps)

Ke každému pull requestu se přes [`wrangler deploy --temporary`](https://developers.cloudflare.com/workers/platform/claim-deployments/) nasadí dočasný náhled na izolovaný Cloudflare účet a do PR se přidá komentář s odkazem. Funguje i pro forky – nepoužívá žádný Cloudflare token.

- Náhled **nemá přístup k produkci** – produkční `database_id` se do buildu nedostane (proměnná `PREVIEW_DEPLOY`), obsah se naplní z `dump.*.sql`.
- **Vyprší za ~60 min**; po každém commitu se nasadí čerstvý.
- Pro trvalý náhled spusť `npx wrangler deploy --temporary` lokálně. První PR od nového přispěvatele může vyžadovat schválení (**Settings → Actions → General**).

Napsat nám můžeš i souukromě:
- [Honza Pobořil](https://honza.poboril.cz) - autor a správce (UX výzkum, design, frontend, backend, devops)
- TODO - šefredaktor blogu
