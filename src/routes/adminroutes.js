import express from 'express';
import { protect, restrictTo,hasPermission } from '../middleware/auth.middleware.js';
const router = express.Router();

import {
 activateAccount,
 deactivateAccount,
 updateUserProfile,
 deleteAccount,
 getAllusers,
 getUserProfile,
 getPendingAssociations,approveAssociation,rejectAssociation
} from "../controllers/admincontroller.js";


router.patch("/activate/:id", protect, restrictTo("admin"), activateAccount);

router.patch("/deactivate/:id", protect, restrictTo("admin"), deactivateAccount);

router.put("/update/:id", protect,updateUserProfile);

router.delete("/delete/:id", protect, restrictTo("admin"), deleteAccount);

router.get("/users", protect, restrictTo("admin"), getAllusers);

router.get("/users/:id", protect, getUserProfile);

router.use(protect, restrictTo('admin'),hasPermission('manage_associations'));
router.get('/associations/pending', getPendingAssociations);
router.put('/associations/:id/approve', approveAssociation);
router.put('/associations/:id/reject', rejectAssociation);
export default router;