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

    var youtubeUrl = config.Youtube.Url + "?key=" + key + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video";
    
    CallAndSaveDocument(youtubeUrl, (error, result) => {
        if(error){
            console.error("[Error] occured while calling Youtube API. One retry with secondary key will be made. Error: " + error);
            youtubeUrl = config.Youtube.Url + "?key=" + config.Youtube.SecondaryApiKey + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video";
            CallAndSaveDocument(youtubeUrl, (error, result) => 
            { 
                if(error) 
                {
                    console.error("<< [Error] Failed to fetch on second try as well");
                    return;
                }
                console.log("<< Fetching latest videos [" + result + "] on second try..");
            });
            return;
        }
        console.log("<< Fetching latest videos [" + result + "] on first try..");
    });
}

function CallAndSaveDocument(youtubeUrl, done) {
    console.log("Trying to fetch latest videos from : " + youtubeUrl);
    
    HttpGet(youtubeUrl, (jsonResponse) => {
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
            done(null, "success");
        }
        
    }, (error) => { console.error(error); done(error);});

    
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

function HttpGet(url, successCallback, errorCallback){

    const https = require('https');
    https.get(url, (resp) => {
    let data = '';

    // A chunk of data has been received.
    resp.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
        var response = JSON.parse(data);
        if(response.error != null)
        {
            console.error("One or more errors occured: " + response.error.message);
            errorCallback(response.error.message);
        }
        successCallback(response);
    });

    }).on("error", (err) => {
        console.error("Error: " + err.message);
    });
}