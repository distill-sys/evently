/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";

import * as next from "next"; // Import the next.js library
import nextConfig from "../../next.config";
import path from "path";

const dev = process.env.NODE_ENV !== "production";
const app = next({dev, conf: nextConfig, dir: path.resolve(__dirname, "../../")});

export const nextApp = onRequest(async (req, res) => {
  await app.prepare();
});
