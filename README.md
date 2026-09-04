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
- Obrázky se ukládají do `public/images/blog/` s názvy souborů ve formátu `nazev-clanku-obrazek.jpg`
- V článku se zobruje datum zveřejnění článku, to se nastaví v názvu souboru. (Tedy musí být aktualizováno před schválením v pull requestu.)

### People

- Profily autorů článků, organizátorů apod. se ukládají do `content/people/` s názvy souborů ve formátu `jmeno.md`
- Avatary se ukládají do `public/images/avatars/` s názvy souborů ve formátu `jmeno.jpg` (čtverec min 512px)
- Odkaz na Nostr by měl začínat na `nprofile...` nebo `npub...` (tedy ne URL)

### Integrace kalendáře s Portalem

Kalendář načítá události z `https://portal.einundzwanzig.space/`, kde je vypisují jejich organizátoři. Aby propojení fungovalo, tak je potřeba v `content/communities/mesto.md` vyplnit `portal_meetup_id` (po vytvoření meetupu v Portálu).

## Předpřipravený devcontainer

Visual Studio Code nebo GitHub Workspace umožňují použít devcontainer, který má předinstalované doporučené extensions a nastavení. Cokoliv v něm spustíš (nebo AI agent) tak bude izolováno od tvého systému pomocí Docker kontejneru (nechat AI se autonomně hrabat v tvém počítači je opravdu špatný nápad 😉).

Používáme image [`opencode-gsd-devcontainer`](https://github.com/iBobik/opencode-gsd-devcontainer), který kromě doporučených extensions a nastavení obsahuje i předpřipravený AI stack (více v sekci [OpenCode](#opencode---ai-agent) níže).

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

V základu můžeš zdarma používat free modely (obvykle denní limit, stačí na jednodušší úkoly).

Nejlepší modely můžeš použít třeba přes [PPQ.ai](https://ppq.ai/invite/a586e70a), kde si nabiješ kredit (přes LN 5% sleva) a můžeš anonymně používat modely různých firem. Klíč poté přidáš přímo v OpenCode příkazem `/connect` → vyber **PPQ** → vlož klíč. Uloží se do gitignorované složky `.devcontainer/data/`, takže vydrží i po restartu devcontaineru.

Image dále obsahuje:

- **Model Council** – `/council <dotaz>` položí stejný dotaz více modelům a shrne, kde se shodují a kde ne (výchozí rada má 7 PPQ modelů od různých firem).
- **GSD model profiles** – `GSD_MODELS_PROFILE=claude|gpt|mixed` před spuštěním `opencode` zvolí, jaké modely se použijí pro GSD agenty; `/gsd-models-profile` vypíše aktivní volbu.
- **GSD** – autonomní plánování, implementace a verifikace větších úkolů. Začni přes `/gsd-onboard`
- **Browser tooling** – Chromium, Playwright, agent-browser a gsd-browser pro práci s prohlížečem uvnitř kontejneru. Agenti jsou nastavení aby to použily automaticky.

## GIT workflow

- Pokud nemáš jasné zadání z existující Issue, tak jí nejdříve založ a zkonzultuj co a jak chceš udělat.
- Vždy začínáme z `master` větve, pak vytvoř svou novou větev se smysluplným názvem např. `feature/tankovani-paliva-na-orbite` nebo `fix/oprava-kavovaru`
- Vždy se snaž udělat co nejmenší commit po kterém to je funkční (nebo měj dobrý důvod proč zveřejnit jen draft).
- Vytvoř Pull request a popiš co jsi a proč udělal (většinou stačí odkaz na issue a předvyplněné commit message, pokud jsi je napsal smysluplně). Nezapomeň na označení Draft pokud to ještě není hotové ke schválení.

## Náhledové verze (review apps)

Ke každému pull requestu se přes [`wrangler deploy --temporary`](https://developers.cloudflare.com/workers/platform/claim-deployments/) nasadí dočasný náhled na izolovaný Cloudflare účet a do PR se přidá komentář s odkazem. Funguje i pro forky – nepoužívá žádný Cloudflare token.

- Náhled **nemá přístup k produkční databázi**.
- **Vyprší za ~60 min**; po každém commitu se nasadí čerstvý.
- Pro trvalý náhled spusť `npx wrangler deploy --temporary` lokálně.
- První PR může vyžadovat schválení (pokud máš nový GitHub účet).

Napsat nám můžeš i soukromě:

- [Honza Pobořil](https://honza.poboril.cz) - autor a správce (UX výzkum, design, frontend, backend, devops)
- [@Long-BTC-81](https://x.com/TomBures81) - šefredaktor blogu
