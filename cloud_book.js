//aboout Book实体
var AV = require('leanengine');

//通过id查询
function queryBookById(id,callback){
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
//通过isbn查询，10位或13位
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
//将book的json转object
function jsonToObj(json){
    var json=eval('('+json+')');
    json.idid=json.id;//将id变为idid
    delete json.id;
    return json;
}
//将数据保存，参数json是string
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
//联网在douban根据id获取
function queryBookByDouBanID(id,callback){
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
//联网在douban根据isbn获取
function queryBookByDouBanIsbn(id,callback){
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

//联网根据关键字搜索
function searchBookByKey(key,offset,count,callback){
    AV.Cloud.httpRequest({
        url: 'https://api.douban.com/v2/book/search?tag='+key+'&start='+offset+'&count='+count,
        success: function(httpResponse){
            callback(httpResponse.text,null);
        },
        error: function(httpResponse){
            callback(null,httpResponse.text);
        }
    });
}

//联网根据图书id获取点评
function queryAnnotationsByBookId(id,offset,count,callback){
    AV.Cloud.httpRequest({//https://api.douban.com/v2/book/1003078/annotations?count=10
        url: 'https://api.douban.com/v2/book/'+id+'/annotations?start='+offset+'&count='+count,
        success: function(httpResponse){
            callback(httpResponse.text,null);
        },
        error: function(httpResponse){
            callback(null,httpResponse.text);
        }
    });
}


// 云函数  根据id查询，先在数据库查询，查不到再联网获取并保存到数据库，并返回
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
// 云函数  根据isbn查询
AV.Cloud.define('query_book_isbn',function(request,response){
    var id=request.params.isbn;
    console.log('cloud function (query_book_id) :params.isbn='+id);
    var len=id.length;
    if(len!=10&&len!=13){//isbn必须为10或13位
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

//Cache表，查询联网请求的cache
function queryCache(hash,callback){
    var query=new AV.Query('Cache');
    query.equalTo('hash',hash);
    query.first({
        success:function(obj){
            callback(obj,null);
        },
        error:function(error){
            callback(null,error);
        }
    });
}
//保存cache到数据库中
function savaCache(hash,content,callback){
    var Cache=AV.Object.extend('Cache');
    var c=new Cache();
    c.set('hash',hash);
    c.set('content',content);
    c.save(null,{
        success:function(obj){
            callback(obj,null);
        },
        error:function(obj,error){
            callback(obj,error);
        }
    });
}

// 云函数  根据关键字搜索，数据库中有缓存
AV.Cloud.define('search_book',function(request,response){
    console.log('cloud function search_book ');
    var key=request.params.key;
    var offset=request.params.offset;
    var count=request.params.count;
    if(offset==null){
        offset=0;
    }
    if(count==null){
        count=10;
    }
    var hash='search_'+key+'_'+offset+'_'+count;
    console.log('hash='+hash);
    queryCache(hash,function(obj,error){
        if(obj==null){//没有缓存
            console.log('没有缓存,开始联网获取');
            searchBookByKey(key,offset,count,function(obj2,err2){
                if(obj2==null){//联网获取失败
                    console.log('从douban获取数据失败');
                    response.error(err2);                 
                }else{
                    savaCache(hash,obj2,function(obj3,err3){
                        console.log('从douban获取数据成功 返回客户端');
                        response.success(obj3);
                    });
                } 
            });
        } else{//存在缓存
            console.log('存在缓存，返回客户端');
            response.success(obj);
        }
    });
});


// 云函数  根据图书id获取点评，数据库中有缓存
AV.Cloud.define('query_book_annotations',function(request,response){
    console.log('cloud function query_book_annotations ');
    var id=request.params.book_id;
    var offset=request.params.offset;
    var count=request.params.count;
    if(id==null||id===0){
        response.error('bookid错误');
        return;
    }
    if(offset==null){
        offset=0;
    }
    if(count==null){
        count=10;
    }
    var hash='annotations_'+id+'_'+offset+'_'+count;
    console.log('hash='+hash);
    queryCache(hash,function(obj,error){
        if(obj==null){//没有缓存
            console.log('没有缓存,开始联网获取');
            queryAnnotationsByBookId(id,offset,count,function(obj2,err2){
                if(obj2==null){//联网获取失败
                    console.log('从douban获取数据失败');
                    response.error(err2);                 
                }else{
                    savaCache(hash,obj2,function(obj3,err3){
                        console.log('从douban获取数据成功 返回客户端');
                        response.success(obj3);
                    });
                } 
            });
        } else{//存在缓存
            console.log('存在缓存，返回客户端');
            response.success(obj);
        }
    });
});
function getApiToken(callback){
    var myDate = new Date();
    var datestring=myDate.getFullYear()+'-'+(myDate.getMonth()+1)+'-'+myDate.getDate()+'T'+myDate.getHours()+':'+myDate.getMinutes()+':'+myDate.getSeconds()+'+08:00';
    var uuid=Math.random()+'a'+Math.random()+'1139a3a54faf9118ca122c4c4da3263e13'+Math.random()+''+Math.random()+''+Math.random();
    AV.Cloud.httpRequest({
        method: 'POST',
        url:'https://read.douban.com/api/v2/account/register_device',
        headers:{
            'User-Agent':'"MI4" (Android 5.1.1); Ark (360_Market) 2.2.0',
            'X-UDID':uuid,
            'Content-Type':'application/json',
            'X-Device-Time':datestring,
            'Connection':'Keep-Alive',
            'Accept-Encoding': 'gzip',
            'Content-Length': '70',
            'Host': 'read.douban.com'
        },
        body:'{"key":"04962fc37ab154fa0dc28f4a7013feee","secret":"2245a724b34f361a"}',
        success:function(response){
            console.log(response.text);
            callback(response.text,null);
        },
        error:function(response){
            console.log(response);
            callback(response.text,null);
        }
    });
}

AV.Cloud.define('token',function(request,response){
    getApiToken(function(text,e){
        response.success(text); 
    });
});
module.exports = AV.Cloud;
