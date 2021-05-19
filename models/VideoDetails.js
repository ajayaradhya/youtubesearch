var mongoose = require('mongoose');
var config = require('../config');

//TODO: Use nested object for thumbnails
const VideoDetailSchema = new mongoose.Schema(
    {
           videoId:             {	 type: String, default: "Unknown", index: { unique: true } },
           title:               {	 type: String, default: "Unknown" },
           description:         {	 type: String, default: "Unknown" },
           thumbnailDefault:    {	 type: String, default: "Unknown" },
           thumbnailHQ:         {	 type: String, default: "Unknown" },
           thumbnailMQ:         {	 type: String, default: "Unknown" },
           channelTitle:        {	 type: String, default: "Unknown" },
           channelId:           {	 type: String, default: "Unknown" },
           documentCreationDate:{	 type: Date, expires: config.DOCUMENT_RETENTION_IN_MINUTES+'m', default: Date.now },
           publishTime:         {	 type: Date },
    },
    { collection: 'VideoDetails'}
);

VideoDetailSchema.index({title: "text", description: "text"});

module.exports = mongoose.model('VideoDetails', VideoDetailSchema);