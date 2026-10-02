# Rozpis služeb – byt Střední

Živě: https://ronnie3697.github.io/RozpisSluzebStredni/

Statická webovka bez buildu: `index.html` + `styles.css` + `app.js`. Stačí otevřít `index.html` v prohlížeči.

## Jak rotace funguje

Rotace funguje jako papírové kolo. Vnější prstenec jsou pokoje 1–4 a ty se nehýbou. Vnitřní kotouč má 4 dílky
a každý dílek je dvojice služeb:

| Dílek | Společná služba | K tomu |
|---|---|---|
| 1 | Kuchyň | záchod |
| 2 | Předsíň | koupelna |
| 3 | Schody | záchod |
| 4 | Odpadky | koupelna |

Každé pondělí se kotouč pootočí o jeden dílek po směru hodinových ručiček. Těžší společné služby (kuchyň, schody)
jdou se záchodem, lehčí (předsíň, odpadky) s koupelnou. Sousední dílky se střídají, takže pokoje 1+2 i 3+4 mají
každý týden jeden koupelnu a druhý záchod, vždycky ten svůj.

## Úpravy

- **Začátek rozpisu:** konstanta `START` v `app.js`, první týden je pondělí 5. 10. 2026. Rozpis pak běží
  donekonečna, žádná tabulka na 52 týdnů.
- **Pořadí a dvojice služeb:** pole `SLICES` v `app.js`.
- **Náplň služeb a domovní řád:** přímo v `index.html`.
- **Kontrola jiného dne:** `index.html?dnes=2026-11-05` se tváří, jako by byl ten den.

„Můj pokoj“ a zvolený pohled tabulky si pamatuje prohlížeč (localStorage). Tisk (tlačítko Vytisknout nebo Ctrl+P)
dá 2 stránky A4: rozpis na 16 týdnů a náplň služeb s domovním řádem.
