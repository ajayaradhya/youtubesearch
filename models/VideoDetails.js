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
           publishTime:         {	 type: Date },

           //this ensures that the video record gets deleted after a specified number of minutes/hours.
           //advantage here is that this does not allow too many old records to be kept in the db
           documentCreationDate:{	 type: Date, expires: config.DOCUMENT_RETENTION_IN_MINUTES+'m', default: Date.now }, 
    },
    { collection: 'VideoDetails'}
);

//Indexing the given fields by text makes string search easy
VideoDetailSchema.index({title: "text", description: "text"});

module.exports = mongoose.model('VideoDetails', VideoDetailSchema);