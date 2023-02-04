/** source/routes/posts.ts */
import express from 'express';
import controller_uni_routes from '../controllers/routes';
const router = express.Router();

router.get('/tokens/:chainId/:inputToken/:outputToken/:amount', controller_uni_routes.getRoutes);
router.get('/', controller_uni_routes.welcome_message);

export = router;