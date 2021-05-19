var mongoose = require('mongoose');

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
           publishTime:         {	 type: Date, index: true },
    },
    { collection: 'VideoDetails'}
);

VideoDetailSchema.index({title: "text", description: "text"});

module.exports = mongoose.model('VideoDetails', VideoDetailSchema);