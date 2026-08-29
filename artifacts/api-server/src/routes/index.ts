import { Router, type IRouter } from "express";
import addressesRouter from "./addresses";
import adminRouter from "./admin";
import authRouter from "./auth";
import cartRouter from "./cart";
import catalogueRouter from "./catalogue";
import healthRouter from "./health";
import ordersRouter from "./orders";
import publicRouter from "./public";
import riderRouter from "./rider";

const router: IRouter = Router();

// Open surfaces: no session required.
router.use(healthRouter);
router.use(publicRouter);
router.use(authRouter);
router.use(catalogueRouter);

// Guarded surfaces. Each is mounted under its own prefix so its auth
// middleware only ever runs for its own paths.
router.use("/addresses", addressesRouter);
router.use("/cart", cartRouter);
router.use("/orders", ordersRouter);
router.use("/admin", adminRouter);
router.use("/rider", riderRouter);

export default router;
