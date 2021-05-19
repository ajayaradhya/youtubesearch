var config = require('../config')
var VideoDetailSchema = require('../models/videoDetails')
var datetime = require('node-datetime');
var paginateInfo = require('paginate-info');

//Responsible for fetcing the youtube videos based on the given search criteria
//Adds the records into db if they are not already present
exports.FetchLatestVideos = () => {
    console.log(">> Fetching latest videos");

    //retrieve API related info from config
    const key = config.Youtube.ApiKey;
    const maxResults = config.Youtube.MaxResult;
    const searchString = config.Youtube.SearchString;
    const regionCode = config.Youtube.Region;

    //making sure to fetch records that are published in last year
    var dateNow = new Date();
    dateNow.setFullYear( dateNow.getFullYear() - config.Youtube.FilterResultsForLastNumOfYears);
    var dt = datetime.create(new Date(), config.Youtube.DateFormat);
    var publishedAfter = dt.format();

    //computing youtube data v3 url from config
    var youtubeUrl = config.Youtube.Url + "?key=" + key + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video";
    
    /*
    Calling youtube data API ans save the records
    Uses a fallback mechanism where if the first call fail, 
    we use secondary api access key to call the youtube api 
    */

    //Attempt #1 
    CallAndSaveDocument(youtubeUrl, (error, result) => {
        if(error){
            //Error is seen on attempt #1
            console.error("[Error] occured while calling Youtube API. One retry with secondary key will be made. Error: " + error);
            
            //Getting secondary api access key frm config
            youtubeUrl = config.Youtube.Url + "?key=" + config.Youtube.SecondaryApiKey + "&part=snippet&maxResults=" + maxResults + "&order=date&publishedAfter=" + publishedAfter + "&q=" + searchString + "&regionCode=" + regionCode + "&safeSearch=strict&type=video";
            
            //Attempt #2 : with secondary key
            CallAndSaveDocument(youtubeUrl, (error, result) => 
            { 
                if(error) 
                {
                    //Second attemt has failed too. No retry will be made.
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

//Responsible for calling youtube API and saving results in the db
function CallAndSaveDocument(youtubeUrl, done) {
    console.log("Trying to fetch latest videos from : " + youtubeUrl);
    
    //Using a generic http GET method
    HttpGet(youtubeUrl, (jsonResponse) => {
        if(jsonResponse != null && jsonResponse.items != null)
        {
            //Response contains some videos
            jsonResponse.items.forEach(item => {

                //Checking if the ID is present already
                VideoDetailSchema
                    .findOne({videoId: item.id.videoId})
                    .exec({}, (err,result) => {
                        if(err){ console.error("Failed to check if video exists in the db"); return; }

                        if(result != null){ return; } //video exists. No need to add now.

                        //Video is not present. Should be added to db.
                        var videoDetail = new VideoDetailSchema({
                            videoId: item.id.videoId,
                            title: item.snippet.title,
                            description: item.snippet.description,
                            channelTitle: item.snippet.channelTitle,
                            channelId: item.snippet.channelId,
                            thumbnailDefault: item.snippet.thumbnails.default.url,
                            publishTime: item.snippet.publishTime 
                        });

                        //Writing in-memory object to mongodb
                        videoDetail.save();
                        console.log("Added video to db [" + item.id.videoId + "]");
                    });
            });
            //this callback notifies the caller that no errors are seen
            done(null, "success");
        }
        
    }, 
    //Notifies the caller that an error is seen
    (error) => { console.error(error); done(error);});
}


//Responsible for returning the videos stored in db
//This returns a paginated result
//Caller should ensure that currentPage and pageSize are set on the query string
//If query string doesn't contain any details, a default page size and currentPage as 1 will be returned
exports.GetVideos = async (req, res) => {
    const currentPage = req.query.currentPage;
    const pageSize = req.query.pageSize;

    try{
        //approx num of records in the colelction
        const count = await VideoDetailSchema.estimatedDocumentCount();
        const {limit, offset} = paginateInfo.calculateLimitAndOffset(currentPage, pageSize);
        const rows = await VideoDetailSchema.find({}).limit(limit).skip(offset);
        const meta = paginateInfo.paginate(currentPage, count, rows, pageSize);
        
        //meta holds the deials for the caller to navigate to next page
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

//Responsible for searching through the db given as search criteria
//Does the search in title and description
//Returns the records in the sorted order of their rankings in search
exports.SearchVideos = (req, res) => {
    var searchItems = req.query.q;
    if(searchItems == null)
    {
        return res.json({error: "Please pass search strings under q query string. ex: q=Coffee Tea"})
    }
    
    VideoDetailSchema
        .find(

            //uses text index that is set in the model
            //text index is defined on title and description
            //Hence the search happens on both the fields
            { $text: { $search: searchItems } },

            //score holds the score to which the current record matches the search criteria
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