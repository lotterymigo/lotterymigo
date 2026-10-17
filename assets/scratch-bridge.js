/* Puts the scratch dealer on window so the classic page script can call it. */
import { dealScratch } from "./scratch-deals.js";

window.lmDealScratch = dealScratch;
