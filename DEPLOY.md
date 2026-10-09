# Getting Charades onto your iPhone (and the App Store)

Three ways in, from "five minutes, free" to "anyone can download it". Each one
builds on the last, so start at the top.

| | Try it now | Your own iPhone | App Store |
|---|---|---|---|
| Cost | Free | $99/year Apple Developer Program | Same $99/year |
| Time | 5 minutes | ~30 minutes the first time | An afternoon, plus Apple's review |
| Needs a Mac? | No | No | No |
| Works without your computer? | No | Yes | Yes |
| Works with no Wi-Fi or signal? | Once it's open | Yes, always | Yes, always |

You need [Node.js](https://nodejs.org) 22 or newer on your computer for all of
them. Then, once, in this folder:

```sh
npm install
```

---

## 1. Try it now — free, no Apple account

1. On your iPhone, install **Expo Go** from the App Store.
2. On your computer, run:
   ```sh
   npm start
   ```
3. Point your iPhone's camera at the QR code in the terminal and tap the
   banner. Charades opens inside Expo Go.

Your phone and computer need to be on the same Wi-Fi. If that's awkward (office
or hotel Wi-Fi), run `npx expo start --tunnel` instead.

This is the fastest way to play and to see changes live, but it runs inside
Expo Go and needs your computer running. For a real app icon on your home
screen, keep going.

### Does it need Wi-Fi?

**The real app (steps 2 and 3) never needs the internet.** Every deck, every
game mode, your stats and your decks live on the phone. Airplane mode, a cabin,
a basement with no bars: it all works, from the very first launch. There is no
login, no download on first open and no update check.

**Expo Go is the exception, and only while you're developing.** Expo Go loads
the game from your computer, so the phone needs your Wi-Fi to *open* it. Once
it's open you can switch Wi-Fi off and play; you only need it back to reload
or to see a change you just made. Your friends never deal with this: once you
install the real app, Wi-Fi isn't part of it.

### What works in Expo Go

Almost everything. A few features need the real app from step 2, because Expo
Go doesn't include the parts of iOS they use. In Expo Go they're greyed out or
hidden, not broken.

| Feature | Expo Go | Real app (step 2) |
|---|---|---|
| All decks, Classic, Banned and 3 Rounds, chaos, forfeits | ✅ | ✅ |
| Friends, Wrapped, group deck builder, photo cards | ✅ | ✅ |
| Big decks over several QR codes | ✅ | ✅ |
| AirDrop a deck and it opens in Charades | — | ✅ |

---

## 2. A real app on your own iPhone

This builds Charades in the cloud with Expo's build service (EAS) and gives
you a link that installs it like any other app. No Mac and no Xcode needed.

**You need:** an [Apple Developer Program](https://developer.apple.com/programs/)
membership ($99/year — enrolment can take a day or two to be approved) and a
free [Expo account](https://expo.dev/signup).

1. **Pick your app ID.** Apple needs one nobody else has used:
   ```sh
   npm run setup
   ```
   Press return to accept the suggestion (like `com.yourname.charades`).

2. **Log in to Expo:**
   ```sh
   npx eas-cli@latest login
   ```

3. **Register your iPhone** (once per phone):
   ```sh
   npm run phone:add
   ```
   Choose "Website", open the link it shows **on your iPhone**, and install the
   profile it offers (Settings → General → VPN & Device Management).

4. **Build it:**
   ```sh
   npm run phone
   ```
   The first time, it asks you to log in with your Apple ID and offers to
   create the certificates for you — say yes to everything. The build takes
   about 15 minutes in the cloud; you can close the terminal and it carries on.

5. **Install it.** When the build finishes you get a link and a QR code. Open
   it on your iPhone and tap Install.

6. **Turn on Developer Mode** the first time (iOS 16 and later): Settings →
   Privacy & Security → Developer Mode → On. Your phone restarts. Then open
   Charades.

To update it later, run `npm run phone` again and install the new link.

> **Turning the phone sideways needs a fresh build too.** The app used to be
> portrait-only, and that is baked into the installed app. Run `npm run phone`
> once more so it can turn with the phone.

> **After any update that changes the app's native parts** (sound, tilt,
> turning sideways, light mode), run `npm run phone` once more and install
> the new link.

### Five things to check on a real iPhone

Everything is tested, but these can only be checked on a phone. Each takes a
minute.

1. **No internet.** Swipe down Control Centre, turn on airplane mode (and make
   sure Wi-Fi is off too), then force-close Charades and open it again. Play a
   round: everything should work exactly the same.
2. **Tilt.** Start a round and hold the phone on your forehead however feels
   natural, upright or sideways, leaning back a little is fine. Give it a
   second to settle, then nod the screen down toward the floor for got it, up
   toward the ceiling to pass. A quick nod is enough. If you'd rather tap or
   swipe, switch it under Settings → How you answer.
3. **Sound.** With the ring/silent switch on ring, play a round: a ding for got
   it, a whoosh for a pass, beeps on the countdown, a buzzer at the end. Flip
   the switch to silent and they stop.
4. **Turning and pausing.** Mid-round, turn the phone from upright to sideways
   and back: the card should follow and the timer keep going. Tap the pause
   button in the corner, wait, then tap to carry on.
5. **AirDrop.** Share a deck as a file to another iPhone with Charades
   installed. It should offer to open in Charades and land on "Add this deck?".

> **No paid account but you have a Mac?** Install Xcode, plug in your iPhone
> and run `npx expo run:ios --device`. It installs with a free Apple ID, but
> Apple makes it stop working after 7 days until you run it again.

---

## 3. Put it on the App Store

Everything above, plus a listing. Most of the listing is already written —
`store.config.json` has the description, keywords, category and age rating,
and it uploads with one command.

### Before you start

- **The name.** The store name is "Charades: Make Your Own Decks"; the first
  upload creates the App Store Connect app with it (set in `eas.json`). If
  Apple says it's taken, change `appName` in `eas.json` and `"title"` in
  `store.config.json` to something like "Charades! Make Your Own Decks".
- **The privacy policy link.** `store.config.json` points at
  <https://bywilliaml.com/charades/privacy>, which is served from the
  `byw1/bywilliaml.com` repo and works whether or not this repository is public.
  It mirrors [`PRIVACY.md`](./PRIVACY.md); change the two together. The
  marketing link is the landing page, <https://bywilliaml.com/charades>.
- Run `npm run setup` if you haven't already.

### Ship it

1. **Build and upload:**
   ```sh
   npm run store
   ```
   This builds the release version and sends it to App Store Connect. The first
   time, it offers to create the app in App Store Connect for you — say yes.

2. **Try it on TestFlight.** About 15 minutes after the upload finishes, the
   build appears in [App Store Connect](https://appstoreconnect.apple.com) →
   your app → TestFlight. Add yourself as an internal tester, install the
   **TestFlight** app on your iPhone, and play a round. You can invite friends
   the same way.

3. **Upload the listing:**
   ```sh
   npm run store:listing
   ```
   This fills in the description, keywords, categories and age rating from
   `store.config.json`. Edit that file and run it again any time.

4. **Finish in App Store Connect** (the parts that can't be automated):
   - **Screenshots.** Play a game on your phone and press Side + Volume Up on
     the screens you're proudest of — the Play screen, a card mid-round, a
     "Big brain" flash, the recap, and the You page with a streak going are a
     good set. Apple needs at least one
     set for the 6.9" or 6.5" iPhone size; screenshots from a recent Pro Max
     fit directly.
   - **App Privacy** → Get Started → "No, we do not collect data from this
     app". That's true: Charades has no servers and no analytics.
   - **Pricing** → Free.
   - **App Review Information** → your name, email and phone, so Apple can
     reach you. No demo account is needed.
   - Under the version, choose the build you uploaded.

5. **Submit.** Tap **Add for Review**, then **Submit**. Review usually takes a
   day or two. When it's approved, release it from App Store Connect (the
   listing is set to manual release, so nothing goes live by surprise).

### Shipping an update

Change the code, bump `"version"` in `app.json` (for example `0.1.0` →
`0.2.0`), then:

```sh
npm run store
```

Build numbers increase automatically. Then pick the new build in App Store
Connect and submit it for review.

---

## Command cheat sheet

| Command | What it does |
|---|---|
| `npm start` | Run it in Expo Go on your phone |
| `npm run setup` | Choose your app ID (once) |
| `npm run phone:add` | Register an iPhone for direct installs |
| `npm run phone` | Build an installable copy for your registered phones |
| `npm run store` | Build and upload to App Store Connect / TestFlight |
| `npm run store:listing` | Upload the description, keywords and age rating |
| `npm test` | Run the tests |

## Licensing note

The source code is AGPL-3.0. As the copyright holder you can ship the App Store
build under a separate licence — see [NOTICE](./NOTICE). Anyone else who forks
this must rename it; see [TRADEMARK.md](./TRADEMARK.md).
