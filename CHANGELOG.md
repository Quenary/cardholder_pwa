# [1.8.0](https://github.com/Quenary/cardholder_pwa/compare/v1.7.0...v1.8.0) (2025-11-08)


### Features

* **ci:** multi-platform build ([2e30271](https://github.com/Quenary/cardholder_pwa/commit/2e30271154ff2cef73ba8d79df97d9ca107d7d7e))

# [1.7.0](https://github.com/Quenary/cardholder_pwa/compare/v1.6.1...v1.7.0) (2025-07-13)


### Features

* **frontend:** preserve code color inversion ([4081f0b](https://github.com/Quenary/cardholder_pwa/commit/4081f0bd371e4518bb2ba03e17373aec88936fd9))

## [1.6.1](https://github.com/Quenary/cardholder_pwa/compare/v1.6.0...v1.6.1) (2025-07-05)


### Bug Fixes

* **backend:** fix used_at date format (to naive dt) ([a5f7d35](https://github.com/Quenary/cardholder_pwa/commit/a5f7d35b1ad7a89b05779a1bc379aae11de27e61))

# [1.6.0](https://github.com/Quenary/cardholder_pwa/compare/v1.5.10...v1.6.0) (2025-07-05)


### Bug Fixes

* **frontend:** card favorite button prevents click on code ([4014720](https://github.com/Quenary/cardholder_pwa/commit/40147204313d6adc52717fac6be101110e891c32))


### Features

* **backend:** added card is_favorite and used_at ([62f9094](https://github.com/Quenary/cardholder_pwa/commit/62f9094db3abdb4ffb41ea688ecf6c3388229876)), closes [#21](https://github.com/Quenary/cardholder_pwa/issues/21)
* **frontend:** add favorite cards ([8241cb5](https://github.com/Quenary/cardholder_pwa/commit/8241cb509241d7b191711eea6fc4098cff80739d)), closes [#21](https://github.com/Quenary/cardholder_pwa/issues/21)
* **frontend:** cards sorting and filtering ([a5e41f3](https://github.com/Quenary/cardholder_pwa/commit/a5e41f335515ab86f68b93e7441d7b6b170a5b44)), closes [#21](https://github.com/Quenary/cardholder_pwa/issues/21)

## [1.5.10](https://github.com/Quenary/cardholder_pwa/compare/v1.5.9...v1.5.10) (2025-07-01)


### Bug Fixes

* **ci:** move fetch and reset of main to build job to get latest commit with CHANGELOG.md ([4c630a0](https://github.com/Quenary/cardholder_pwa/commit/4c630a0b85cdb595312d97f3714b5bcaeb0cf24a))

## [1.5.9](https://github.com/Quenary/cardholder_pwa/compare/v1.5.8...v1.5.9) (2025-07-01)


### Bug Fixes

* **ci:** add fetch and reset of main after semantic-release to get latest commit with CHANGELOG.md ([fdb03f2](https://github.com/Quenary/cardholder_pwa/commit/fdb03f24070f86b179ef160d5165f82955be0ae7))

## [1.5.8](https://github.com/Quenary/cardholder_pwa/compare/v1.5.7...v1.5.8) (2025-07-01)


### Bug Fixes

* older CHANGELOG.md in image because of fetch-depth in build job ([236469b](https://github.com/Quenary/cardholder_pwa/commit/236469b05603b72cef39198c97946b22b26bc2ad))

## [1.5.7](https://github.com/Quenary/cardholder_pwa/compare/v1.5.6...v1.5.7) (2025-06-30)


### Bug Fixes

* **frontend:** sw caching and updating ([47a937f](https://github.com/Quenary/cardholder_pwa/commit/47a937fd15540e1a0f1ded154f9fa548fa6df67b))

## [1.5.6](https://github.com/Quenary/cardholder_pwa/compare/v1.5.5...v1.5.6) (2025-06-30)


### Bug Fixes

* **backend:** unicorn listen on 0.0.0.0 ([a796a34](https://github.com/Quenary/cardholder_pwa/commit/a796a341d8c05a71f28a481d96c04e1572bea744)), closes [#36](https://github.com/Quenary/cardholder_pwa/issues/36)

## [1.5.5](https://github.com/Quenary/cardholder_pwa/compare/v1.5.4...v1.5.5) (2025-06-30)


### Bug Fixes

* **backend:** suitable create status codes (201) ([05bf03d](https://github.com/Quenary/cardholder_pwa/commit/05bf03d1e144193f1738e78a59dd0b0af89d3270))

## [1.5.4](https://github.com/Quenary/cardholder_pwa/compare/v1.5.3...v1.5.4) (2025-06-29)


### Performance Improvements

* **frontend:** replace toSignal with selectSignal ([fa246bb](https://github.com/Quenary/cardholder_pwa/commit/fa246bb651916d4b3fbdb0da65b8162ba8b3eae6))

## [1.5.3](https://github.com/Quenary/cardholder_pwa/compare/v1.5.2...v1.5.3) (2025-06-27)

## [1.5.2](https://github.com/Quenary/cardholder_pwa/compare/v1.5.1...v1.5.2) (2025-06-26)


### Bug Fixes

* **frontend:** version compare with changelog ([f707248](https://github.com/Quenary/cardholder_pwa/commit/f707248d6878c06e62b54fefbe83dc81440ec721)), closes [#31](https://github.com/Quenary/cardholder_pwa/issues/31)

## [1.5.1](https://github.com/Quenary/cardholder_pwa/compare/v1.5.0...v1.5.1) (2025-06-26)


### Bug Fixes

* after update changelog may have been loaded from cache ([ae71d18](https://github.com/Quenary/cardholder_pwa/commit/ae71d1848bf01b398541a9e410923c40868e2db6)), closes [#31](https://github.com/Quenary/cardholder_pwa/issues/31)

# [1.5.0](https://github.com/Quenary/cardholder_pwa/compare/v1.4.2...v1.5.0) (2025-06-26)


### Bug Fixes

* **backend:** null env var in public settings ([895c82d](https://github.com/Quenary/cardholder_pwa/commit/895c82d8cd10649dbdcbdd29d0dd01bf2570f73a)), closes [#12](https://github.com/Quenary/cardholder_pwa/issues/12)
* **frontend:** disable sign-up button if registration disabled ([99e7321](https://github.com/Quenary/cardholder_pwa/commit/99e732165d5a31569d1c2746a109bbb73d38925b)), closes [#28](https://github.com/Quenary/cardholder_pwa/issues/28)


### Features

* **backend:** added public settings endpoint ([110c8e1](https://github.com/Quenary/cardholder_pwa/commit/110c8e145ca05a96a06fb9d8b943a37dbea975ec)), closes [#28](https://github.com/Quenary/cardholder_pwa/issues/28)
* **backend:** env var to disable smtp ([078ce3c](https://github.com/Quenary/cardholder_pwa/commit/078ce3c79565768a5067d39fbce22027ea329dd7)), closes [#12](https://github.com/Quenary/cardholder_pwa/issues/12)
* **frontend:** add app public settings ([18b14aa](https://github.com/Quenary/cardholder_pwa/commit/18b14aa10e634360af2dc96bc1f71c3e22e0d47b)), closes [#28](https://github.com/Quenary/cardholder_pwa/issues/28) [#12](https://github.com/Quenary/cardholder_pwa/issues/12)
* **frontend:** disable password recovery button by env var ([6bc8201](https://github.com/Quenary/cardholder_pwa/commit/6bc8201ece691bf1a3dde25abcbc2b5c62c80dff)), closes [#12](https://github.com/Quenary/cardholder_pwa/issues/12)

## [1.4.2](https://github.com/Quenary/cardholder_pwa/compare/v1.4.1...v1.4.2) (2025-06-26)


### Bug Fixes

* **frontend:** changelog dialog may appear before update dialog ([1d9d43b](https://github.com/Quenary/cardholder_pwa/commit/1d9d43bf678be6f7eb71b6ae8b01ec7d4d5e3008)), closes [#11](https://github.com/Quenary/cardholder_pwa/issues/11)

## [1.4.1](https://github.com/Quenary/cardholder_pwa/compare/v1.4.0...v1.4.1) (2025-06-26)


### Bug Fixes

* copy CHANGELOG.md to frontend ([43b6d46](https://github.com/Quenary/cardholder_pwa/commit/43b6d466a8c1bd398d79f027a7804deda272f2ff)), closes [#11](https://github.com/Quenary/cardholder_pwa/issues/11)

# [1.4.0](https://github.com/Quenary/cardholder_pwa/compare/v1.3.0...v1.4.0) (2025-06-26)


### Bug Fixes

* **frontend:** safer json from storage ([3a5f1b2](https://github.com/Quenary/cardholder_pwa/commit/3a5f1b218b2fefb5319514b72f60762de4fceb12))
* remove backend/frontend versions ([59d05f4](https://github.com/Quenary/cardholder_pwa/commit/59d05f48e849872dd2833580953e318f1c736859)), closes [#11](https://github.com/Quenary/cardholder_pwa/issues/11)


### Features

* add changelog on frontend ([79b97b3](https://github.com/Quenary/cardholder_pwa/commit/79b97b353a4c2684fb518fb7ad375f789e9fba57)), closes [#11](https://github.com/Quenary/cardholder_pwa/issues/11)
* **frontend:** add changelog dialog after update ([09940fe](https://github.com/Quenary/cardholder_pwa/commit/09940fe0ff7359c6b09e99c58cb885fe8e882e2c)), closes [#11](https://github.com/Quenary/cardholder_pwa/issues/11)

# [1.3.0](https://github.com/Quenary/cardholder_pwa/compare/v1.2.0...v1.3.0) (2025-06-25)


### Features

* add alt scanner (quagga2) ([#26](https://github.com/Quenary/cardholder_pwa/issues/26)) ([d3240b4](https://github.com/Quenary/cardholder_pwa/commit/d3240b4c8057497b990db422c71b3c31b48edb7a)), closes [#19](https://github.com/Quenary/cardholder_pwa/issues/19)

# [1.2.0](https://github.com/Quenary/cardholder_pwa/compare/v1.1.0...v1.2.0) (2025-06-23)


### Features

* card description in code dialog ([#25](https://github.com/Quenary/cardholder_pwa/issues/25)) ([d027397](https://github.com/Quenary/cardholder_pwa/commit/d027397ae169b110ac948d6cdd125fce80251b2e)), closes [#20](https://github.com/Quenary/cardholder_pwa/issues/20)

# [1.1.0](https://github.com/Quenary/cardholder_pwa/compare/v1.0.0...v1.1.0) (2025-06-23)


### Features

* **backend:** add delay on login, reg, recovery requests ([#24](https://github.com/Quenary/cardholder_pwa/issues/24)) ([ca68bb6](https://github.com/Quenary/cardholder_pwa/commit/ca68bb603c14133a36f46dc4d8d9dc005b7ecf22)), closes [#23](https://github.com/Quenary/cardholder_pwa/issues/23)

# 1.0.0 (2025-06-23)


### Features

* **test:** force release ([7b1efa6](https://github.com/Quenary/cardholder_pwa/commit/7b1efa6cc8206a576eb80585d6ae97ca74cbc92f))
