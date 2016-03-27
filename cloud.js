var AV = require('leanengine');


AV.Cloud.define('http_test', function(request, response) {

    var http = require('http');

    var options = {
        host: 'www.baidu.com'
    };

    var req = http.request(options, function(res){
        res.setEncoding('UTF-8');
        res.on('data', function(data){
            //console.log(data);
            response.success("ok ");
        });
    });

    //req.write(contents);
    req.end();  
});


AV.Cloud.define('clouddata_test', function(request, response) {
    var query = new AV.Query('Book');
    query.find({
        success: function(results) {
            response.success(results[0].get('tags')[0]);
        },
        error: function() {
            response.error('搜索失败');
        }
    });
});




AV.Cloud.define('http_cloud_test', function(request, response) {
    var Book=AV.Object.extend('Book');      
    AV.Cloud.httpRequest({
        url: 'https://api.douban.com/v2/book/isbn/9787121269394',
        success: function(httpResponse) {
            //console.log(httpResponse.text);
            //response.success(httpResponse.text);
            var html=httpResponse.text;
            var json=eval('('+html+')');
            json.idid=json.id;//将id变为idid
            delete json.id;
            // console.log(json.id+","+json.idid);

            // return;
            //	console.log(data);
            var object=JSON.parse(html);
            console.log(html);
            return;
            var book=new Book();
            //book.set('rating',object.rating.average);
            //book.set('title',object.title);
            //var data='{"title":"title","price":"26"}';
            //console.log(data);
            //var abc =JSON.parse(data);
            //console.log(abc);
            //console.log(object);
            book.save(object, {
                success: function(post) {
                    console.log('id='+post.id);
                    response.success('ok');
                    //alert('New object created with objectId: ' + post.id);
                },
                error: function(post, error) {
                    response.success('error');
                    //alert('Failed to create new object, with error message: ' + error.message);
                    console.log('error:'+error+"  post:"+post);  
                    console.log(error);
                    console.log(post);
                }
            });

        },
        error: function(httpResponse) {
            console.error('Request failed with response code ' + httpResponse.status);
        }
    });
});





function queryBookById(id,callback){
    //var Book =AV.Object.extend('Book');
    var query=new AV.Query('Book');
    query.equalTo("idid",id);
    query.first({
        success:function(obj){
            callback(obj,null);
        },
        error:function(error){
            callback(null,error);
        }
    });
}

function queryBookByIsbn(isbn,callback){
    var query=new AV.Query('Book');
    var len=isbn.length;
    if(len==10){
        query.equalTo('isbn10',isbn);
    }else{
        query.equalTo('isbn13',isbn);
    }  
    query.first({
        success:function(obj){
            callback(obj,null);
        },
        error:function(error){
            callback(null,error);
        }
    });
}


function jsonToObj(json){
    var json=eval('('+json+')');
    json.idid=json.id;//将id变为idid
    delete json.id;
    return json;
    //var re= JSON.parse(json);
    //console.log('111:'+re);
    //return re;
}

function savaBook(json,callback){
    var Book=AV.Object.extend('Book');   	
    var book=new Book();
    book.save(jsonToObj(json), {
        success: function(obj) {
            callback(obj,null);
        },
        error: function(obj, error) {
            callback(obj,error);
        }
    });
}

function queryBookByDouBanID(id,callback){
    var Book=AV.Object.extend('Book');      
    AV.Cloud.httpRequest({
        url: 'https://api.douban.com/v2/book/'+id,
        success: function(httpResponse) {
            callback(httpResponse.text,null);
        },
        error: function(httpResponse) {
            callback(null,httpResponse.text);	
        }
    });
}


function queryBookByDouBanIsbn(id,callback){
    var Book=AV.Object.extend('Book');      
    AV.Cloud.httpRequest({
        url: 'https://api.douban.com/v2/book/isbn/'+id,
        success: function(httpResponse) {
            callback(httpResponse.text,null);
        },
        error: function(httpResponse) {
            callback(null,httpResponse.text);	
        }
    });
}



AV.Cloud.define('query_book_id',function(request,response){
    var id=request.params.id;
    console.log('cloud function (query_book_id) :params.id='+id);
    queryBookById(id,function(obj,error){//先从数据库中读取
        if(obj==null){//数据库没有，需从douban获取
            console.log('query_book_id 尝试从douban获取数据');
            queryBookByDouBanID(id,function(obj2,error2){//从douban获取
                if(obj2==null){//从douban获取失败
                    console.log('query_book_id douban获取数据失败:'+error2);
                    response.error(error2);
                }else{
                    console.log('query_book_id douban获取数据成功 ');
                    savaBook(obj2,function(obj3,error3){
                        console.log('query_book_id 将数据保存到数据库，并返回给客户端 title:'+obj3.get('title'));
                        response.success(obj3);//发送到客户端
                    });//保存到cloud
                }
            });
        }else{//从数据库获取成功
            console.log('query_book_id  获取数据成功 ：服务器已经存在该数据  title:'+obj.get('title'));
            response.success(obj);
        }
    });
});


AV.Cloud.define('query_book_isbn',function(request,response){
    var id=request.params.isbn;
    console.log('cloud function (query_book_id) :params.isbn='+id);
    var len=id.length;
    if(len!=10&&len!=13){
        console.log('query_book_isbn '+id +' ISBN不合法');
        response.error('ISBN号不合法！');
        return;
    }
    queryBookByIsbn(id,function(obj,error){//先从数据库中读取
        if(obj==null){//数据库没有，需从douban获取
            console.log('query_book_id 尝试从douban获取数据');
            queryBookByDouBanIsbn(id,function(obj2,error2){//从douban获取
                if(obj2==null){//从douban获取失败
                    console.log('query_book_id douban获取数据失败:'+error2);
                    response.error(error2);
                }else{
                    console.log('query_book_id douban获取数据成功 ');
                    savaBook(obj2,function(obj3,error3){
                        console.log('query_book_id 将数据保存到数据库，并返回给客户端 title='+obj3.get('title'));
                        response.success(obj3);//发送到客户端
                    });//保存到cloud
                }
            });
        }else{//从数据库获取成功
            console.log('query_book_id  获取数据成功 ：服务器已经存在该数据 title='+obj.get('title'));
            response.success(obj);
        }
    });
});


module.exports = AV.Cloud;
