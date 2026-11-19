# Play Console — Data Safety form: fill-in guide

This maps Helyx's actual data handling to the Play Console **Data Safety**
questionnaire so `[You]` can complete it quickly and accurately. Answers below
reflect the app as built; re-check if data practices change.

> Play's definition of **"collected"** = data transmitted off the device. Helyx
> stores training, health, location, photos and profile data **on-device only**;
> none of it is transmitted. The only automatic egress is the configured Sentry
> crash reporter. Crash/diagnostic collection is therefore **Required** unless
> an opt-out is added or the DSN is removed before release.

Official references (re-check at submission time):
- [Google Play Data Safety form](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Health Connect / sensitive-permission policy](https://support.google.com/googleplay/android-developer/answer/16558241)

## Global answers
- **Is all data encrypted in transit?** → **Yes** (HTTPS/TLS to Sentry, Google Fonts, and the tile server).
- **Do you provide a way to request data deletion?** → **Not applicable to an account** (Helyx has no accounts). Local data is deleted in-app via Settings → Reset All Data, or by clearing app storage/uninstalling.
- **Data collected is required or optional?** → Only crash/diagnostic reporting leaves the device, and it is **Required** because the distributed build has no user opt-out.
- **Do you share data with third parties?** → **Legal review required.** Sentry may qualify for Play's service-provider exception. The public OpenStreetMap tile service and Google Fonts must be classified before selecting **No sharing**.

## Data types to declare

| Play category → type | Collected? | Optional? | Purpose(s) | Notes |
|---|---|---|---|---|
| **Location → Approximate/Precise location** | **No** | — | — | Used on-device for GPS run tracking only; never transmitted. Foreground service with visible notification. |
| **Health & fitness → Health info** | **No** | — | — | Read from Health Connect into the on-device app only: steps, sleep duration, resting heart rate and HRV, only fields the user grants. |
| **Health & fitness → Fitness info** | **No** | — | — | Workouts, runs, body weight, streaks and goals stay on the device. |
| **Photos and videos → Photos** | **No** | — | — | An avatar or exercise media is stored on-device only. |
| **App activity → Other user-generated content** | **No** | — | — | Notes, wellness and fasting entries stay on the device. |
| **App info & performance → Crash logs** | Yes | **Required*** | Analytics (app health/crash fixing) | Automatic Sentry error reporting; PII-scrubbed; no performance tracing. *Required unless release configuration changes. |
| **App info & performance → Diagnostics** | Yes | **Required*** | Analytics (app health/crash fixing) | As above. |
| **Device or other IDs** | **No** | — | — | No advertising ID, no analytics IDs. |

For each declared type, the Play form asks: *collected*, *shared*, *processed
ephemerally*, *required/optional*, and *purpose*. Use the table above:
purpose = **App functionality** for on-device data (not collected) and
**Analytics** for crash/diagnostic data. None is used
for **Advertising or marketing** or sold.

## Health Connect specifics
Play + Health Connect have an **additional** policy: apps reading Health Connect
data must show an in-app privacy policy link and only request data types they
use. Helyx requests exactly the four fields listed above, but the current app
still needs the hosted privacy-policy link added to Settings before submission.

## Account deletion (Play requirement)
Helyx has **no accounts**, so Play's account-deletion requirement does not apply.
Local data is removed in Settings → Reset All Data, by clearing app storage, or
by uninstalling. Automatic backup files remain in the folder the user chose until
they delete them. Keep the privacy policy's deletion section honest if this
changes.

## Privacy link and Health Connect
Helyx requests exactly the four Health Connect fields listed above. The hosted
privacy-policy link must still be added to Settings before submission.

## Content rating & target audience (adjacent forms)
- **Target age:** {{16+ recommended}} (health data; not directed at children).
- **Content rating questionnaire:** no violence/sexual/gambling content →
  expect an **Everyone / PEGI 3** style rating. Answer truthfully in the IARC
  questionnaire.
