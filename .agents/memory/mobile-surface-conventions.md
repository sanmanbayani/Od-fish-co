---
name: Expo surface conventions
description: Keyboard/footer composition on the consumer app, and the failure-state rules the mobile screens are held to.
---

# Expo consumer app conventions

## A sticky footer must ride the keyboard

Any screen whose primary action lives in a footer pinned to the bottom of the
window must wrap that footer in `KeyboardStickyFooter`, and its scroll area must
be `KeyboardAwareScrollViewCompat` with a `bottomOffset` roughly the footer's
height.

**Why:** a bare `position: absolute; bottom: 0` footer sits *behind* an open
keyboard. The customer finishes typing an address and cannot see or reach
"Save". Four screens shipped this way (login, address form, checkout, account)
while a correct keyboard-aware wrapper already existed in the repo unused.

**How to apply:** the wrapper supplies the absolute anchoring, so the footer's
own style object must not also set `position/left/right/bottom`. The two
mechanisms are complementary, not competing: `KeyboardAwareScrollView` only
scrolls the *focused input* into view, while `KeyboardStickyView` translates the
*footer*. They do not double-shift on Android edge-to-edge — the keyboard
controller owns the resize mode, which is why `KeyboardProvider` must stay
mounted at the root. Both compat wrappers fall back to plain views on web,
because the browser handles its own keyboard insets.

## Failure states the screens are held to

- A caught mutation error must never set the success flag. Confirming "noted"
  on a failed waitlist join means the customer waits for a message that will
  never arrive.
- A failed *query* must not be rendered as an empty result. "No saved
  addresses", "every slot has closed", and "we could not find that fish" each
  described a working shop as a shut one when the real cause was a dropped
  request.
- An edit form must not render blank when its hydrate source fails. The
  customer retypes from memory and saves the gaps over real data.
- An error state whose only action is "Try again" is a dead end when the
  resource is genuinely gone. Retry belongs to `isError`; a confirmed-missing
  record needs a way *out* (back to the list), not a loop.

## Push notifications cannot be tested in the dev preview

Remote push is a native capability Expo Go no longer carries: on Android
`expo-notifications` throws outright, and neither platform can mint a token for
this project without an EAS `projectId`, which only a real build injects into
the app config. So the whole registration path is dead in the everyday preview
loop, and a notification that "does not arrive" there proves nothing.

**Why:** the natural reaction is to go hunting in the API — device rows, Expo
tickets, the send call — for a failure that is really "this build cannot receive
push at all".

Two web-preview corollaries. First, notification *hooks*
(`useLastNotificationResponse` etc.) crash the Expo web bundle before first
paint — they cannot merely be called conditionally; mount them via a
null-returning component that is only rendered when `Platform.OS !== 'web'`.
Second, in any capability check the web test must come *before*
`Device.isDevice`, because browsers report `isDevice: true`.

**How to apply:** guard registration on both conditions (running in Expo Go, and
a missing project id) and log a plain reason rather than throwing, so the
storefront still works. Verify the server half without a handset: seed a
well-formed but fake `ExponentPushToken[...]`, send to it, and confirm the push
service answers `DeviceNotRegistered` and the row is deleted. That exercises
copy, batching, transport and dead-token cleanup — everything except the last
hop. Real end-to-end verification waits for a real build.
