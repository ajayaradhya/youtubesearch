var express = require('express');
var videoController = require('../controllers/videoController');
var router = express.Router();

/* GET videos listing. */
router.route('/show').get(videoController.GetVideos);
router.route('/search').get(videoController.SearchVideos);

module.exports = router;
