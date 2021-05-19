var VideoDetailSchema = require('../models/VideoDetails')
var datetime = require('node-datetime');

exports.FetchLatestVideos = (req, res) => {
    console.log(">> Fetching latest videos");

    const key = "AIzaSyAU2PP7h_JIQh8fWAgoYvqy5hg5h6zzdgk";
    const maxResults = 50;
    const searchString = "COVID | Corona Virus | Pandemic";
    const regionCode = "IN";

    var dateNow = new Date();
    dateNow.setFullYear( dateNow.getFullYear() - 1 );
    var dt = datetime.create(new Date(), 'Y-m-dTH:M:S.NZ');
    var publishedAfter = dt.format();

    console.log(publishedAfter);
    var response = HttpGet("https://youtube.googleapis.com/youtube/v3/search?key=" + key + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video");
    var jsonResponse = JSON.parse(response);

    if(jsonResponse != null && jsonResponse.items != null)
    {
        jsonResponse.items.forEach(item => {

            VideoDetailSchema
            .findOne({videoId: item.id.videoId})
            .exec({}, (err,result) => {
                if(err)
                {
                    console.error("Failed to check if [" + item.id.videoId + "] exists in the db");
                    return;
                }

                if(result != null)
                {
                    console.log("video with ID [" + item.id.videoId + "] already exists..");
                    return;
                }

                var videoDetail = new VideoDetailSchema({
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    channelTitle: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnailDefault: item.snippet.thumbnails.default.url,
                    publishTime: item.snippet.publishTime 
                });
                videoDetail.save();

                console.log("Added video to db [" + item.id.videoId + "]");
            });
        });
    }
}

function HttpGet(url){
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    //xmlHttp.setRequestHeader("Authorization", "Bearer AIzaSyAU2PP7h_JIQh8fWAgoYvqy5hg5h6zzdgk");
    xmlHttp.send(null);
    return xmlHttp.responseText;
}