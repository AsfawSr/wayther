[33mcommit 20966eb33047467d0071bdb3fbe3d42efb431ac4[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:37:13 2026 +0300

    refactor batch weather checkpoints fetching to use parallel streams

[33mcommit 639037550245ae8fcfd3f19524c0b8f1d778fcf9[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:29:37 2026 +0300

    feat: bind interactive sticky tooltips and hover highlights to route segments

[33mcommit a7de0c4b17ec94f325eb1d6a01a6dc2ebba68ad7[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:25:50 2026 +0300

    darken area outside coverage boundaries with slate mask and add glowing dashed border

[33mcommit a61d713323fde24ef8572d288aed1842d0899e80[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:23:04 2026 +0300

    move map style controls into a premium floating toggle widget inside the map

[33mcommit 36dff9133d04d30cfe2794cd8392ca86d07ed194[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:20:46 2026 +0300

    implement bidirectional hover highlighting between timeline cards and map markers

[33mcommit e41ad529fda17a34f02f9a7e116b9608ed70084e[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:16:52 2026 +0300

    add dynamic glassmorphic weather risk legend to bottom-right corner of map

[33mcommit 3a039eb9b54432e33e77fbd1966ab0a166ae47f2[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Jun 12 12:14:07 2026 +0300

    replace simple dot markers with premium FontAwesome icon markers and weather badges

[33mcommit 340116d75b9dda0ee155c48eb08cf39d6b91d636[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Tue Jun 9 14:44:22 2026 +0300

    simplify frontend route flow by removing simulator/saved-trips UI and pruning dead app.js paths

[33mcommit bed2bff806e00085fcc441f578bcd13a4c6400b1[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Jun 8 18:38:04 2026 +0300

    Split frontend helpers into coverage, geo-math, and API modules while preserving app.js behavior and load compatibility.

[33mcommit 3b9fb5622a57ccb2d2f445372eb8610098bdedb6[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Jun 8 18:27:55 2026 +0300

    Introduce typed OSRM route DTOs across controller/service/client while preserving /api/route response shape.

[33mcommit 618d0c69d18abbc19d83b99273189aabaaa04a2e[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Jun 8 18:20:31 2026 +0300

    Tighten WeatherService fallback to provider exceptions only and lock behavior with tests.

[33mcommit aa004d9837cb6fcd13f7e19db762f03be5abad27[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 16:22:20 2026 +0300

    add met.no weather fallback client, speed simulator slider, and saved trips history serialization

[33mcommit 8ee4857e8b6bd24a4cc040a0744b42872a27fad6[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 16:12:37 2026 +0300

    add met.no weather fallback client, speed simulator slider, and saved trips history serialization

[33mcommit d04ca9a355e9ac405acc472231cd8453b7991355[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 15:15:13 2026 +0300

    style: restructure dashboard to two-column sidebar layout, expand map view, and hide technical coordinates

[33mcommit 9fd870c35aa1eb0f48e69df2f75e7486d5f63043[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 12:54:36 2026 +0300

    chore: add Dockerfile for Render deployment

[33mcommit a0e14151dd2f7d2ea5017efa69f9bbb5e9d00e95[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 12:48:05 2026 +0300

    add dynamic Travel Mode support for driving and walking profiles with cache isolation

[33mcommit 8d30091c3f35a37c706d0b777f44c9ae35d9216e[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 12:15:49 2026 +0300

    add glassmorphism theme, Addis bounds visual geofence, compass heading pointer, follow toggle, and click-to-focus timeline cards

[33mcommit 7fdb54930c5300523802f6411f19a5460e1c2afe[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Thu Jun 4 11:56:26 2026 +0300

    resolve map hijacking, linear risk segment rendering, clear route cleanup, and stationary user tracking issues

[33mcommit 23aed33fa2e26d652bc9f3a57e964ba47f517070[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Tue Apr 21 10:01:28 2026 +0300

    Clarify route forecast cards with path-point labels and ETA context to explain repeated destination predictions.

[33mcommit 24c174e23e02b33a772e189400fe2b1b7923bbcd[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 17:48:31 2026 +0300

    chore(release): add MVP ship checklist and env config notes

[33mcommit 4a0702e05d803023fb8aa43293201c854d984bcf[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 17:42:55 2026 +0300

    test(core): cover cache behavior, validation, and error responses

[33mcommit 63c177a0045a2077ddf98c7530ca855e8a706c04[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 17:36:54 2026 +0300

    fix(provider): add timeout-safe clients and robust upstream error mapping

[33mcommit bb58eb12ec5264585f80278df99c470a6b75d92f[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 17:29:34 2026 +0300

    fix(validation): reject invalid coords and missing targetIso early

[33mcommit 3832ba50c3badb5a303a2763dd30bfdb4b815718[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 17:22:54 2026 +0300

    fix(api): unify 4xx/5xx JSON errors for route and weather endpoints

[33mcommit 0a04c7425ad28ef4ed8b31994aede5e7c4059ebe[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 11:25:51 2026 +0300

    Add Addis quick actions, preset locations, and draggable origin/destination markers with coverage-safe validation.

[33mcommit ceecfd69fa310da40688158304abc80ef9947a36[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 11:18:54 2026 +0300

    Add Addis-only geofence foundation with backend coverage validation and frontend map/input bounds enforcement.

[33mcommit a697649cfa8e48cff76e29c6c63dd43fd72f5419[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 10:19:26 2026 +0300

    Fix map style toggle responsiveness with touch/pointer handlers and static asset cache-busting.

[33mcommit fda4a29a72440f35fbf3aea87113966bffb9f6d7[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 10:09:30 2026 +0300

     Add Dark/Satellite Leaflet map toggle with live base-layer switching and active UI state.

[33mcommit a096778b6a1a0ea0ea631170a89a06adc20e621f[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 09:44:04 2026 +0300

    Handle OSRM NoRoute gracefully with structured 422/502 backend responses and UI-friendly route error messaging.

[33mcommit d3a3af9b91dc0307784a821bd9a7f380bdc64474[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Mon Apr 20 09:25:41 2026 +0300

    Improve geolocation UX with secure-context checks, permission-aware handling, and clearer fallback guidance

[33mcommit 7dd0c26dd39575a32507caf510b826abeafd80dc[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 17:10:57 2026 +0300

    feat: add batch future-weather endpoint and switch 15/30/60 timeline forecasts to single-request batching

[33mcommit bbaf3512cfe358055cc8cf8e09fdf1b086180b04[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 17:02:23 2026 +0300

     fix: show timeline placeholder when origin/location is missing or weather fetch is unavailable

[33mcommit b4ba6139048c021cb514bb68505c5444ecbdc657[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 16:51:16 2026 +0300

     refactor: remove manual location panel and route geolocation fallback through live status with origin/destination planning

[33mcommit 0368801ad6f9b79b95d26343fb4266f1dd3e7cc9[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 16:36:51 2026 +0300

    feat: allow map clicks to populate either origin or destination via selectable target mod

[33mcommit a3dead41b3cc4e8285e605d639941fde2e5f67fa[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 16:28:56 2026 +0300

    add explicit from-to route planning with optional origin override and fallback to current location

[33mcommit b26e6f97d3e1283118b55afdef0a336adec65def[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 16:20:21 2026 +0300

    feat: add backend OSRM route proxy with TTL caching and migrate frontend routing calls to /api/route

[33mcommit 58e4ca10807282a5544ca537188b40d9c6840cbf[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 16:04:59 2026 +0300

    feat: add destination-based route forecasting with OSRM ETA sampling and risk overlays

[33mcommit a8f7267ca7d2f5b2175f29c55edea94798bed356[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 15:51:52 2026 +0300

    feat: add retry geolocation button with safe watch restart and auto-exit from manual fallback

[33mcommit 1a5ed22c0914850e4d9f86902a189ebe482cc0a0[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 15:38:49 2026 +0300

    feat: add backend weather proxy endpoints with server-side TTL cache and switch frontend to local API

[33mcommit 933e03653902f8bfd9c1d820f0ceb8d834d8144c[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 15:29:24 2026 +0300

    feat: add dedicated fog severity logic with caution vibe alerts and fog-specific map markers

[33mcommit ec71c559e016a7ac732762bedab76b6048594271[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 15:25:44 2026 +0300

    feat: implement SkyPath SPA with geolocation tracking, projected weather timeline, vibe alerts, and manual fallback

[33mcommit cca584fd67aa70499d7b51a5d129a76ab8db1379[m
Author: Asfaw <asfawyemane21@gmail.com>
Date:   Fri Apr 17 15:11:14 2026 +0300

    first commit
