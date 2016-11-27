var path = require('path');
var express = require('express');
var config = require('./config');
var Bing = require('node-bing-api')({ accKey: config.bing_key });
var MongoClient = require('mongodb').MongoClient;
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/', function(req, res) {
  var fileName = path.join(__dirname + '/public', 'index.html');
  res.sendFile(fileName, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    }
    else {
      console.log('Sent:', fileName);
    }
  });
});

var entries=10;
var db_url = config.url;

var query_fun = function (query_type,info,call_back) {
  MongoClient.connect(db_url, 
    function (err, db) {
      if (err) {
        throw new Error("Unable to connect to the mongoDB server")
      } else {
        console.log('Connection established to', db_url);
        
          var collection=db.collection('url_table');
          
          if(query_type=='find'){
            var options = {"term":1,"when":1,"_id":0,"limit": entries, "sort": [['when','desc']]};
            collection.find( {}, {term:1,when:1,_id:0}  , options).toArray( function(err, doc) {
                      console.log('inside find function');
                      if(err){throw new Error("Unable to query the mongoDB server");}
                      // console.log(doc);
                      db.close();
                      call_back(doc);
                  }
              );
          }else if(query_type=='insert'){
            collection.insert( info  , function(error, data) {
                if (error) throw error;
                // console.log('data',data);
            }); 
            db.close();
          }
      }
    }
  );
  console.log('out of here !!!',query_type);
}


app.get('/api/imagesearch/:QUERY', function (req, res) {
  var query=req.params.QUERY;
  console.log(query);
  var offset=1;
  if(typeof req.query.offset!='undefined'){
    var page_value=parseInt(req.query.offset,10);
    if( !isNaN(page_value) )offset=page_value;
  }
  
  Bing.images( query , {
    top: entries,   // Number of results (max 50) 
    skip: entries*(offset-1),// Skip first offset-1 pages
    adult: 'Off'
  }, function(error, respone, body){
    if(error)console.error(error);
    // console.log('bing image search res:',body.value);
    var results = new Array();
    for (var image in body.value) {
      var link=body.value[image];
      var obj={
        url:link.contentUrl,
        snippet:link.name,
        thumbnail:link.thumbnailUrl,
        context:link.hostPageDisplayUrl
      }
      results.push(obj);
    }
    // console.log('results',results[0]);
    res.send(results);
  });
  
  var info={
    'term':query,
    'when':new Date()
  }
  query_fun('insert',info,null);

  
});

app.get('/api/latest/imagesearch/', function (req, res) {
  var info = { 'term':1, 'when':1 };
  console.log('history function');
  query_fun('find',info,function (doc) {
    console.log('ret');
    res.send(doc);
  });
});

