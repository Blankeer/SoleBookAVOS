var AV = require('leanengine');
//var express=require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var async = require('async');
var app = require('express').Router()
var Book = AV.Object.extend('Book');
var Cache = AV.Object.extend('Cache');
var Tag = AV.Object.extend('Tag');
var BookComment = AV.Object.extend('BookComment');
var BookLike = AV.Object.extend('user_book_like');

var newObjectId = '56ca7ca9816dfa0059c4a1fb';
var hotObjectId = '56cbb9db128fe1005807fba6';
var top250ObjectId = '56cf19fe7db2a20056a56dd2';
function getDoubanIdByHref(href) {
    var start = href.lastIndexOf('subject') + 8;
    var temp = href.substring(start, href.length - 1);
    var lastindex = temp.indexOf('/');
    if (lastindex == -1) {
        return temp
    }
    return temp.substring(0, lastindex);
}

//find book from database
function getBookById(id, callback) {
    var query = new AV.Query('Book');
    query.equalTo('iid', id);
    query.first().then(function (object) {
        callback(object);
    }, function (error) {
        callback(error);
    });
}

// find new books from douban 
function getNewBookIds(callback) {
    superagent.get('http://book.douban.com/latest?icn=index-latestbook-all')
        .set('User-Agent', 'Mozilla/5.0 (G12;Windows; Windows x64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + getCookie() + '"')
        .end(function (err, sres) {
            if (err) {
                callback(null);
                return;
            }
            var $ = cheerio.load(sres.text);
            var items = [];
            $('#content a').each(function (idx, element) {
                var $element = $(element);
                var url = $element.attr('href');
                items.push(getDoubanIdByHref(url));
            });
            //res.send(items);
            callback(items);
        });
}
//get hot tags
function getHotTags(callback) {
    superagent.get('https://book.douban.com/tag/?view=cloud')
        .set('User-Agent', 'Mozilla/5.0 (G12;Windows; Windows x64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + getCookie() + '"')
        .end(function (err, sres) {
            if (err) {
                callback(null);
                return;
            }
            var $ = cheerio.load(sres.text);
            var items = [];
            $('.cloud a').each(function (idx, element) {
                var $element = $(element);
                var name = $element.text().trim();
                items.push(name);
            });
            callback(items);
        });
}

// find hot books from douban 
function getHotBookIds(callback) {
    var results = [];
    var count = 0;
    var call = function (err, sres) {
        if (err) {
            count++;
            if (count == 2) {
                callback(results);
            }
            return;
        }
        var $ = cheerio.load(sres.text);
        $('.chart-dashed-list').find('.media__img a').each(function (idx, element) {
            var $element = $(element);
            var url = $element.attr('href');
            results.push(getDoubanIdByHref(url));
        });
        count++;
        if (count == 2) {
            callback(results);
        }
    }
    superagent.get('http://book.douban.com/chart?subcat=I')
        .set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + getCookie() + '"')
        .end(call);
    superagent.get('http://book.douban.com/chart?subcat=F')
        .set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + getCookie() + '"')
        .end(call);
}
// get douban  top 250
function getTop250BookIds(callback) {
    var call = function (url, back) {
        superagent.get(url)
            .set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0')
            .set('Cookie', 'bid="' + getCookie() + '"')
            .end(function (err, sres) {
                if (err) {
                    back(err, null);
                    return;
                }
                var results = [];
                var $ = cheerio.load(sres.text);
                $('.article .indent .item td a.nbg').each(function (idx, element) {
                    var $element = $(element);
                    var url = $element.attr('href');
                    results.push(getDoubanIdByHref(url));
                });
                back(null, results);
            });
    };
    var urls = [];
    for (var i = 0; i < 10; i++) {
        urls.push('http://book.douban.com/top250?start=' + i * 25);
    }
    async.mapLimit(urls, 1, call, function (err, result) {
        if (err != null) {
            console.log(err);
            callback(null, err);
        }
        else {
            callback(result, null);
        }
    });
}

function getRandomEnChar() {
    var ranNum = Math.ceil(Math.random() * 25);
    return String.fromCharCode(65 + ranNum);
}
function getCookie() {
    return getRandomEnChar() + getRandomEnChar() + getRandomEnChar() + getRandomEnChar() + getRandomEnChar() + getRandomEnChar() + 'qwae' + Math.random() * 30;
}
// find book from douban network
function getDetailsById(id, callback) {
    var cookie = getCookie();
    var url = 'http://book.douban.com/subject/' + id;
    superagent.get(url)
        .set('User-Agent', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + cookie + '"')
        //   .timeout(5000)
        .end(function (err, sres) {
            //console.log(sres.text);
            if (err) {
                if (err.status != null) {
                    console.log("-->id = " + id + ",error:" + err);

                } else {
                    console.log("-->id = " + id + ",error:" + err);
                }
                callback(null, err);
                return;
            }
            var $ = cheerio.load(sres.text);
            var title = $("[property='v:itemreviewed']").text();
            if (title == null || title.length == 0) {
                callback(null, "页面没有标题，访问错误");
                return;
            }
            var img_l = $('.nbg').attr('href');
            var img_m = $('.nbg img').attr('src');
            //$(info).remove();

            var autoer = $('#info').find("a").first().text();
            var infos = $('#info').text();
            var reg = new RegExp('[\\s\\S]*出版社:(.*)[\\s\\S]*');
            var result = reg.exec(infos);
            if (result != null) {
                var chubanshe = result[1].trim();
            }
            reg = new RegExp('[\\s\\S]*出版年:(.*)[\\s\\S]*');
            result = reg.exec(infos);
            if (result != null) {
                var year = result[1].trim();
            }
            reg = new RegExp('[\\s\\S]*页数:(.*)[\\s\\S]*');
            result = reg.exec(infos);
            if (result != null) {
                var yeshu = result[1].trim();
            }
            reg = new RegExp('[\\s\\S]*定价:(.*)[\\s\\S]*');
            result = reg.exec(infos);
            if (result != null) {
                var jiage = result[1].trim();
            }
            reg = new RegExp('[\\s\\S]*装帧:(.*)[\\s\\S]*');
            result = reg.exec(infos);
            if (result != null) {
                var zhuang = result[1].trim();
            }
            reg = new RegExp('[\\s\\S]*ISBN:(.*)[\\s\\S]*');
            result = reg.exec(infos);
            var isbn;
            if (result != null) {
                isbn = result[1].trim();
            }
            if (isbn == null || isbn.length == 0) {
                callback(null, "页面没有isbn，访问错误");
                return;
            }
            var rating = $('strong[property="v:average"]').text().trim();
            ;
            var intro = $('.related_info #link-report');
            var temp = $(intro).find('.intro').last().html();
            if (temp != null) {
                var intro_content = $(temp.replace(/<\/p>/g, "\n")).text().trim();
                ;
            }
            intro = $(intro).next().next();
            temp = $(intro).find('.intro').last().html();
            if (temp != null) {
                var intro_auto = $(temp.replace(/<\/p>/g, "\n")).text();
            }
            var $dir = $('.related_info div.indent#dir_' + id + '_full');
            $dir.children("a").remove();
            var dir = $dir.text();
            dir = dir.substr(0, dir.length - 4).trim();
            ;
            var tags = [];
            $('#db-tags-section .indent a').each(function (idx, element) {
                var $element = $(element);
                tags.push($element.text());
            });
            var re = {
                url: url,
                iid: id,
                title: title,
                img_l: img_l,
                img_m: img_m,
                author: autoer,
                publisher: chubanshe,
                pubdate: year,
                pages: yeshu,
                price: jiage,
                binding: zhuang,
                isbn: isbn,
                rating: rating,
                intro_content: intro_content,
                intro_author: intro_auto,
                dir: dir,
                tags: tags
            }
            callback(re, null);
        });
}
function getBookByDoubanId(id, callback) {
    getBookById(id, function (book) {
        if (book != null) {
            console.log("book id=" + id + " in database get success");
            callback(book, null);
        } else {
            getDetailsById(id, function (res, e) {
                if (e == null) {
                    console.log('book id=' + id + ' in douban network success');
                    new Book().save(res).then(function (object) {
                        callback(object, null);
                        console.log('save database ok');
                    }, function (err) {
                        console.log("err:" + err.status);
                        callback(null, err);
                    });
                } else {
                    console.log('book id=' + id + ' in douban network error' + e);
                    callback(null, e);
                }
            });
        }
    });
}

//find book details by iid (douban id)
AV.Cloud.define('cloud_getBookByDoubanId', function (request, response) {
    var id = request.params.id;
    getBookByDoubanId(id, function (res, e) {
        if (res == null) {
            response.error(e);
        } else {
            response.success(res);
        }
    });
});

app.get('/details', function (req, res, next) {
    var id = req.query.id;
    getBookByDoubanId(id, function (re, e) {
        if (re == null) {
            next(e);
        } else {
            res.send(re);
        }
    });
});
AV.Cloud.beforeSave('Book', function (request, response) {
    var iid = request.object.get('iid');
    if (iid) {
        getBookById(iid, function (res) {
            if (res == null) {
                console.log(iid + " review  ok");
                response.success();
            } else {
                console.log(iid + " review  faile  exist");
                response.error('exist');
            }
        });
    } else {
        response.error('No iid!');
    }
});
AV.Cloud.define('cloud_getNewBookFromDouban', function (request, response) {
    var query = new AV.Query('BookColumn');
    query.get(newObjectId).then(function (newbook) {
        var books = newbook.relation('books');
        getNewBookIds(function (ids) {//get douban  network
            var j = 0;
            for (var i in ids) {
                var id = ids[i];
                getBookByDoubanId(id, function (re, e) {// save database
                    j++;
                    if (re != null) {
                        books.add(re);
                        if (j == ids.length) {
                            newbook.save().then(function (newboo) {
                                console.log("newbook add  ok");
                            }, function (error) {
                                console.log("newbook add   error:" + error);
                            });
                        }
                    }
                });
            }
        });
    }, function (error) {
    });
});
AV.Cloud.define('cloud_getHotTags', function (request, response) {
    getHotTags(function (res) {
        if (res != null) {
            for (var i in res) {
                var t = new Tag();
                t.set("name", res[i]);
                t.save();
            }
            response.success(res);
        } else {
            response.error("error")
        }
    });
});
AV.Cloud.define('cloud_getHotBookFromDouban', function (request, response) {
    var query = new AV.Query('BookColumn');
    query.get(hotObjectId).then(function (hotbook) {
        var books = hotbook.relation('books');
        getHotBookIds(function (ids) {//get douban  network
            var j = 0;
            for (var i in ids) {
                var id = ids[i];
                getBookByDoubanId(id, function (re, e) {// save database
                    j++;
                    if (re != null) {
                        books.add(re);
                        if (j == ids.length) {
                            hotbook.save().then(function (newboo) {
                                console.log("hotbook add  ok");
                            }, function (error) {
                                console.log("hotbook add  error:" + error);
                            });
                        }
                    }
                });
            }
        });
    }, function (error) {
    });
});
AV.Cloud.define('cloud_getTop250FromDouban', function (request, response) {
    var call = function (id, back) {
        console.log('top 250  id=' + id);
        getBookByDoubanId(id, function (re, e) {// save database
            if (re != null) {
                back(null, re);
            } else {
                back(null, null);
            }
        });
    };
    var query = new AV.Query('BookColumn');
    query.get(top250ObjectId).then(function (book) {
        var books = book.relation('books');
        getTop250BookIds(function (result, e) {
            if (e == null) {
                console.log('top250   ids  ok');
                var ids = [];
                for (var i in result) {
                    for (var j in result[i]) {
                        ids.push(result[i][j]);
                    }
                }
                async.mapLimit(ids, 1, call, function (err, result) {
                    if (err != null) {
                        console.log(err);
                    }
                    else {
                        console.log('result size=' + result.length);
                        for (var i in result) {
                            if (result[i]) {
                                var re = result[i];
                                re.set('top', i);
                                re.save().then(function (newb) {
                                    books.add(newb);
                                    var iid = newb.get('iid');
                                    book.save().then(function (r) {
                                        console.log("topbook add " + iid + " ok");
                                    }, function (error) {
                                        console.log("topbook add " + iid + " error:" + error);
                                    });
                                }, function (err) {
                                });
                            }
                        }
                    }
                });
            } else {
                console.log(e);
            }
        });
    }, function (error) {
    });
});
//联网根据关键字搜索
function searchBookIDByKeyNetWork(key, offset, count, callback) {
    var url = 'https://api.douban.com/v2/book/search?q=' + encodeURI(key) + '&start=' + offset + '&count=' + count + '&fields=id';
    // console.log(url);
    superagent.get(url)
        .end(function (err, sres) {
            if (err == null) {
                callback(sres.text, null);
            } else {
                console.log('searchBookIDByKeyNetWork  err  ' + err);
                callback(null, sres.text);
            }
        });
}
function searchBookByTagNetWork(key, page, callback) {
    var skip = (15 * parseInt(page));
    var url = "https://www.douban.com/tag/" + encodeURI(key) + "/book?start=" + skip;
    console.log(url);
    superagent.get(url)
        .set('User-Agent', 'Mozilla/5.0 (G12;Windows; Windows x64; rv:39.0) Gecko/20100101 Firefox/39.0')
        .set('Cookie', 'bid="' + getCookie() + '"')
        .end(function (err, sres) {
            var fail = false;
            if (err == null) {
                var $ = cheerio.load(sres.text);
                var res = [];
                $('#content .article dl dt a').each(function (idx, element) {
                    var $element = $(element);
                    var url = $element.attr('href');
                    res.push(getDoubanIdByHref(url));
                });
                if (res.length > 6) {
                    var json = {books: res};
                    callback(JSON.stringify(json), null);
                }
                else {
                    fail = true;
                }
            } else {
                fail = true;
            }
            if (fail == true) {
                console.log("douban tag fail  ,try to  douban key search ");
                searchBookIDByKeyNetWork(key, skip, 15, function (r, e) {
                    if (e) {
                        callback(null, e);
                    } else {
                        callback(r, null);
                    }
                });
            }
        });
}
function searchBookByTag(tag, page, callback) {
    var hash = 'search_' + tag + '_' + page;
    queryCache(hash, function (obj, err) {
        if (obj == null) {
            console.log('searchBookByTag  no cache');
            searchBookByTagNetWork(tag, page, function (obj2, err2) {
                if (obj2 == null) {
                    console.log('searchBookByTagNetWork error :' + err2);
                    callback(null, 'searchBookByTagNetWork err :' + err2);
                } else {
                    savaCache(hash, obj2, function (obj3, err3) {
                        console.log('从douban获取数据成功 返回客户端');
                        callback(obj2, null);
                    });
                }
            });
        } else {
            console.log('searchBookByTag  存在缓存，返回客户端');
            callback(obj, null);
        }
    });
}
function searchBookIDByKey(key, offset, count, callback) {
    var hash = 'search_' + key + '_' + offset + '_' + count;
    queryCache(hash, function (obj, error) {
        if (obj == null) {//没有缓存
            console.log('没有缓存,开始联网获取');
            searchBookIDByKeyNetWork(key, offset, count, function (obj2, err2) {
                if (obj2 == null) {//联网获取失败
                    console.log('从douban获取数据失败' + err2);
                    callback(null, 'get database fail!' + err2);
                } else {
                    savaCache(hash, obj2, function (obj3, err3) {
                        console.log('从douban获取数据成功 返回客户端');
                        callback(obj2, null);
                    });
                }
            });
        } else {//存在缓存
            console.log('存在缓存，返回客户端');
            callback(obj, null);
        }
    });
}
// secrch by tag
AV.Cloud.define('cloud_search_tag', function (request, response) {
    var key = request.params.key;
    var page = request.params.page;
    var call = function (id, back) {
        console.log('search  id=' + id);
        getBookByDoubanId(id, function (re, e) {// save database
            if (re != null) {
                back(null, re);
            } else {
                back(null, null);
            }
        });
    }
    if (page == null) {
        page = 0;
    }
    console.log('cloud_search_tag key=' + key);
    searchBookByTag(key, page, function (text, e) {
        if (e) {
            response.error(e);
        } else {
            console.log(' search ids=' + text);
            var json = eval('(' + text + ')');
            var ids = [];
            var books = json.books;
            for (var i in books) {
                if (typeof(books[i]) != 'string') {
                    ids.push(books[i].id);
                } else {
                    ids.push(books[i]);
                }
            }
            async.mapLimit(ids, 5, call, function (err, result) {
                if (err != null) {
                    console.log(err);
                    response.error(err)
                }
                else {
                    console.log("search finsh");
                    response.success(result);
                }
            });

        }
    });
});

function cloud_search_key(key, response) {
    var call = function (id, back) {
        console.log('search  id=' + id);
        getBookByDoubanId(id, function (re, e) {// save database
            if (re != null) {
                back(null, re);
            } else {
                back(null, null);
            }
        });
    }
    searchBookIDByKey(key, 0, 20, function (text, err) {
        if (err) {
            response.error(err);
        } else {
            console.log(' search ids=' + text);
            var json = eval('(' + text + ')');
            var ids = [];
            var books = json.books;
            for (var i in books) {
                ids.push(books[i].id);
            }
            async.mapLimit(ids, 5, call, function (err, result) {
                if (err != null) {
                    console.log(err);
                    response.error(err)
                }
                else {
                    console.log("search finsh");
                    response.success(result);
                }
            });
        }
    });
}
// search by key     app new   2016/5/4
AV.Cloud.define('cloud_search_book', function (request, response) {
    var key = request.params.key;
    console.log('cloud_search_book key=' + key);
    if (isIsbn(key)) {
        queryBookByIsbn(key, function (data, err) {
            if (err) {
                cloud_search_key(key, response);
            } else {
                console.log("isbn " + key + "is exist in db!");
                response.success(data);
            }
        })
    } else {
        cloud_search_key(key, response);
    }
});


//Cache表，查询联网请求的cache
function queryCache(hash, callback) {
    var query = new AV.Query('Cache');
    query.equalTo('hash', hash);
    query.first({
        success: function (obj) {
            if (obj == null) {
                callback(null, 'null');
            } else {
                callback(obj.get('content'), null);
            }
        },
        error: function (error) {
            callback(null, error);
        }
    });
}
//保存cache到数据库中
function savaCache(hash, content, callback) {
    var c = new Cache();
//    var json=eval('('+content+')');
    if (content.length <= 50) {
        callback(null, "data is length <50  ignore!");
        return;
    }
    c.set('hash', hash);
    c.set('content', content);
    c.save(null, {
        success: function (obj) {
            callback(obj, null);
        },
        error: function (obj, error) {
            callback(obj, error);
        }
    });
}
//联网在douban根据isbn获取
function queryBookByDouBanIsbn(id, callback) {
    AV.Cloud.httpRequest({
        url: 'https://api.douban.com/v2/book/isbn/' + id,
        success: function (httpResponse) {
            callback(httpResponse.text, null);
        },
        error: function (httpResponse) {
            callback(null, httpResponse.text);
        }
    });
}
//通过isbn查询，10位或13位
function queryBookByIsbn(isbn, callback) {
    var query = new AV.Query('Book');
    query.equalTo('isbn', isbn);
    query.first({
        success: function (obj) {
            if (obj) {
                var books = [];
                books.push(obj);
                callback(books, null);
            } else {
                callback(null, error);
            }
        },
        error: function (error) {
            callback(null, error);
        }
    });
}
function isIsbn(isbn) {
    if (isNaN(isbn)) {
        return false;
    }
    var len = isbn.length;
    if (len != 10 && len != 13) {
        return false;
    }
    return true;
}
// 云函数  根据isbn查询
AV.Cloud.define('cloud_search_isbn', function (request, response) {
    var id = request.params.isbn;
    console.log('cloud function (cloud_search_isbn) :params.isbn=' + id);
    var len = id.length;
    if (len != 10 && len != 13) {//isbn必须为10或13位
        console.log('query_book_isbn ' + id + ' ISBN不合法');
        response.error('ISBN号不合法！');
        return;
    }
    queryBookByIsbn(id, function (obj, error) {//先从数据库中读取
        if (obj == null) {//数据库没有，需从douban获取
            console.log('query_book_id 尝试从douban获取数据');
            queryBookByDouBanIsbn(id, function (obj2, error2) {//从douban获取
                if (obj2 == null) {//从douban获取失败
                    console.log('query_book_id douban获取数据失败:' + error2);
                    response.error(error2);
                } else {
                    console.log('query_book_id douban获取数据成功 ');
                    var json = eval('(' + obj2 + ')');
                    getBookByDoubanId(json.id, function (re, e) {// save database
                        if (re != null) {
                            response.success(re);
                        } else {
                            response.error(e);
                        }
                    });
                }
            });
        } else {//从数据库获取成功
            console.log('query_book_id  获取数据成功 ：服务器已经存在该数据 title=' + obj.get('title'));
            response.success(obj);
        }
    });
});
/**
 * 随机获得一个
 */
function getRandomBook(callback) {
    var t = Math.ceil(Math.random() * 300);
    var query = new AV.Query('Book');
    query.skip(t).limit(1);
    query.first().then(function (object) {
        console.log("getRandomBook  book=" + object + "," + t);
        callback(object);
    }, function (error) {
        console.log("getRandomBook  error=" + error + "," + t);
        getRandomBook(callback);
    });
}
// 云函数  获得随机book,count是获得数量
AV.Cloud.define('cloud_random_book', function (request, response) {
    var count = request.params.count;
    var res = [];
    for (var i = 0; i < count; i++) {
        getRandomBook(function (obj) {
            res.push(obj);
            if (res.length == count) {
                response.success(res);
            }
        });
    }
});

// 评论保存之后,给对方发送推送
AV.Cloud.afterSave('BookComment', function (request) {
    var replyId = request.object.get("reply").id;
    var q = new AV.Query("BookComment");
    // console.log(replyId);
    q.equalTo("objectId", replyId);
    q.first().then(function (reply) {
        if (reply != null) {
            var query = new AV.Query('_Installation');
            q = new AV.Query("_User");
            q.equalTo("objectId", reply.get("user").id);
            q.first().then(function (user) {
                console.log('userid=' + user.id);
                query.equalTo('installationId', user.get("deviceId"));
                AV.Push.send({
                    where: query,
                    data: {
                        alert: '你收到了新的回复'
                    }
                });
                console.log('发送回复提醒推送成功,userid=' + user.id);
            });
        }
    }, function (error) {
        console.log(error);
    });
});

function sleep(n) {
    var start = new Date().getTime();
    while (true) if (new Date().getTime() - start > n)  break;
}
module.exports = AV.Cloud;
//module.exports = app;
