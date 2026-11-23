# The World Today — Monday 23 November 2026

[![news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/deriharyanto1/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/deriharyanto1/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123)

Entry for [Sum up 23 November's world news in one image](https://make.fun/bounty/news-image-20261123) on make.fun.

## What it is

A one-page newspaper, **THE WORLD TODAY**, drawn entirely in code by `main.ts`
(Node 22, no network, no dependencies). It sums up Monday 23 November 2026 in
**48 stories from 10 regions**: one top story (COP31 collapses in Antalya),
9 illustrated panels, 37 one-line briefs, and one quote — from North America,
South America, Western Europe, Eastern Europe, the Middle East, Africa,
South Asia, East Asia, Southeast Asia, and Oceania.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes only `out/entry.png` (1024 x 1024, under 1 MiB). Run it twice and the
bytes are identical.
