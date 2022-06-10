Font metrics for reliable text display
======================================

Recommended reading:

- [Deep dive CSS: font metrics, line-height and vertical-align](https://iamvdo.me/en/blog/css-font-metrics-line-height-and-vertical-align)
- [Why is a slight gap added between rows on HDPI screens, causing this striped effect?](https://stackoverflow.com/q/72496727/2854284)

Font installation statistics (but how reliable are they?):

- http://www.visibone.com/font/FontResults.html
- https://lonewolfonline.net/web-safe-font-list/
- https://www.cssfontstack.com/

Metrics of AsyncGlk fonts
-------------------------

Using FontForge, go to Element -> Font Info -> OS/2 -> Metrics

If Win Ascent and HHead Ascent differ, then Win Ascent is used by Windows and HHead Ascent by MacOS. (I don't know about Linux.)

| Font name              | OS    | Ascender | Descender | Content-area |
|------------------------|-------|----------|-----------|--------------|
| Georgia                | All   | 91.7%    | 21.9%     | 113.6%       |
| Times New Roman        | All   | 89.1%    | 21.6%     | 110.7%       |
| Liberation Serif       | Linux | 89.1%    | 21.6%     | 110.7%       |
| Iosevka                | All   | 96.7%    | 28.3%     | 125%         |
| Lucida Console         | Win   | 78.9%    | 21.1%     | 100%         |
| Lucida Sans Typewriter | MacOS | 96.4%    | 21.1%     | 117.5%       |
| DejaVu Sans Mono       | Linux | 92.8%    | 23.6%     | 116.4%       |

We use the Content-area to calculate the half-leading CSS variables: a `line-height` of `1.4` means 140% of 1em. So if the Content-area is 125%, then the leading is 15%, half of which is 7.5%, so `--glkote-mono-half-leading` should be set to `0.075em`.

Except that it doesn't work that way [if the browser's zoom isn't 100%](https://stackoverflow.com/q/72567599/2854284). Sigh.

So the current plan is to use padding only for proportional, based on Georgia's metrics. `@font-face` `ascent-override`/`descent-override` properties will make Times New Roman and Liberation Serif conform to Georgia's metrics when those fonts are used. And for monospaced text, the `span`s will be made `display: inline-block` so that they take up the full line height. So that it behaves when the text is longer than one line, monospaced text will be broken up by words.