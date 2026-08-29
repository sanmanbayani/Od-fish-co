/**
 * Device registration for order push notifications.
 *
 * The phone hands us the Expo push token it was issued; we file it against the
 * signed-in customer. Both routes require a customer session, so a device can
 * only ever be attached to — or detached from — the account that is actually
 * signed in on it.
 */
import { RegisterPushDeviceBody, UnregisterPushDeviceBody } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { parseBody } from "../lib/http";
import { forgetPushDevice, registerPushDevice } from "../lib/push";
import { requireCustomer } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireCustomer);

router.post("/devices", async (req, res) => {
  const body = parseBody(RegisterPushDeviceBody, req.body);

  await registerPushDevice({
    customerId: req.customer!.id,
    token: body.token,
    platform: body.platform ?? null,
  });

  res.json({ ok: true });
});

router.post("/devices/unregister", async (req, res) => {
  const body = parseBody(UnregisterPushDeviceBody, req.body);

  await forgetPushDevice(req.customer!.id, body.token);

  res.json({ ok: true });
});

export default router;
