var AV = require('leanengine');
var express=require('express');
var superagent=require('superagent');
var cheerio=require('cheerio');
var app=express();


function getDetailsById(id,callback){
    superagent.get('http://book.douban.com/subject/'+id)
    .end(function (err, sres) {      	
        //console.log(sres.text);  
        if (err) {
            callback(null,err);    
            return;     
        } 

        var $ = cheerio.load(sres.text);   
        var title=$("[property='v:itemreviewed']").text();
        if(title==null||title.length==0){
            callback(null,"页面没有标题，访问错误");
        }
        var img_l=$('.nbg').attr('href');
        var img_m=$('.nbg img').attr('src');	
        //$(info).remove();	

        var autoer=$('#info').find("a").first().text();	
        var infos=$('#info').text();	
        var reg=new RegExp('[\\s\\S]*出版社:(.*)[\\s\\S]*');	
        var result=reg.exec(infos);
        if(result!=null){	var chubanshe=result[1].trim();	}
        reg=new RegExp('[\\s\\S]*出版年:(.*)[\\s\\S]*');	
        result=reg.exec(infos);
        if(result!=null){	var year=result[1].trim();}	
        reg=new RegExp('[\\s\\S]*页数:(.*)[\\s\\S]*');	
        result=reg.exec(infos);	
        if(result!=null){		var yeshu=result[1].trim();	}	
        reg=new RegExp('[\\s\\S]*定价:(.*)[\\s\\S]*');	
        result=reg.exec(infos);
        if(result!=null){	var jiage=result[1].trim();}	
        //console.log(res);	

        reg=new RegExp('[\\s\\S]*装帧:(.*)[\\s\\S]*');
        result=reg.exec(infos);
        if(result!=null){	var zhuang=result[1].trim();}
        reg=new RegExp('[\\s\\S]*ISBN:(.*)[\\s\\S]*');	
        result=reg.exec(infos);
        if(result!=null){	var isbn=result[1].trim();}	
        var rating=$('strong[property="v:average"]').text();
        //var intros=$('.related_info .intro');	

        var intro=$('.related_info #link-report');
        var temp=$(intro).find('.intro').last().html();
        if(temp!=null){
            var intro_content=$(temp.replace(/<\/p>/g,"\n")).text();
        }
        intro=$(intro).next().next();	
        //console.log();

        temp=$(intro).find('.intro').last().html();
        if(temp!=null){
            var intro_auto=$(temp.replace(/<\/p>/g,"\n")).text();	
        }
        var $dir=$('.related_info div.indent#dir_'+id+'_full');
        $dir.children("a").remove();	
        var dir=$dir.text();	
        dir=dir.substr(0,dir.length-4);   
        //$('#content a').each(function (idx, element) {    

        //  var $element = $(element);    
        //  items.push($element.attr('href'));     
        //});	

        var items={
            iid:id,
            title:title,
            img_l:img_l,	
            img_m:img_m,	
            author:autoer,		
            publisher:chubanshe,		
            pubdate:year,	
            pages:yeshu,	
            price:jiage,		
            binding:zhuang,	
            isbn:isbn,	
            rating:rating,		
            intro_content:intro_content,	
            intro_author:intro_auto,	
            dir:dir	
        }  
        callback(items,null);
    });
}

var Book=AV.Object.extend('Book');
AV.Cloud.define('cloud_pachong_all_book', function(request, response) {
    console.log('start...');
    for(var i=1;i<4;i++){
        getDetailsById(1000000+i,function(res,e){
            if(e==null){
                console.log(res.iid+" - ok");
                //var b=new Book();
                // b.save(res);
            }else{
                console.log(e.status);
            }
        });   
        sleep(1000);
    }
});
function   sleep(n)   
{   
    var  start=new Date().getTime();   
    while(true) if(new Date().getTime()-start>n)  break;   
}   
module.exports = AV.Cloud;
