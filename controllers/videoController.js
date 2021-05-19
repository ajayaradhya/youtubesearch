var config = require('../config')
var VideoDetailSchema = require('../models/videoDetails')
var datetime = require('node-datetime');
var paginateInfo = require('paginate-info');

exports.FetchLatestVideos = () => {
    console.log(">> Fetching latest videos");

    const key = config.Youtube.ApiKey;
    const maxResults = config.Youtube.MaxResult;
    const searchString = config.Youtube.SearchString;
    const regionCode = config.Youtube.Region;

    var dateNow = new Date();
    dateNow.setFullYear( dateNow.getFullYear() - config.Youtube.FilterResultsForLastNumOfYears);
    var dt = datetime.create(new Date(), config.Youtube.DateFormat);
    var publishedAfter = dt.format();

    console.log(publishedAfter);
    var response = HttpGet(config.Youtube.Url + "?key=" + key + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video");
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
                    /*console.log("video with ID [" + item.id.videoId + "] already exists.."); */
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

exports.GetVideos = async (req, res) => {
    const currentPage = req.query.currentPage;
    const pageSize = req.query.pageSize;

    try{
        const count = await VideoDetailSchema.estimatedDocumentCount();
        const {limit, offset} = paginateInfo.calculateLimitAndOffset(currentPage, pageSize);
        const rows = await VideoDetailSchema.find({}).limit(limit).skip(offset);
        const meta = paginateInfo.paginate(currentPage, count, rows, pageSize);
        return res.json({
            result : rows,
            meta: meta
        });
    }
    catch(error)
    {
        console.error(error);
        return res.status(500).send({error: error})
    }
}

exports.SearchVideos = (req, res) => {
    var searchItems = req.query.q;
    if(searchItems == null)
    {
        return res.json({error: "Please pass search strings under q query string. ex: q=Coffee Tea"})
    }
    
    VideoDetailSchema
    .find(
        { $text: { $search: searchItems } },
        { score: { $meta: "textScore" } }
     ).sort( { score: { $meta: "textScore" } } )
    .exec({}, (err, result) => {
        if(err)
        {
            console.error("Failed to search for [" + searchItems + "] in the db. error: " + err);
            return res.json({result: []});
        }
        return res.json({
            result: result
        });
    });
}

function HttpGet(url){
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    //xmlHttp.setRequestHeader("Authorization", "Bearer AIzaSyAU2PP7h_JIQh8fWAgoYvqy5hg5h6zzdgk");
    xmlHttp.send(null);
    return xmlHttp.responseText;
}