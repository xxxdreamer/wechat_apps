//morningf@foxmail.com

var ccFile = require('../../utils/calendar-converter.js')
var calendarConverter = new ccFile.CalendarConverter();
var util = require("../../utils/todo_util.js");
var app = getApp();

//月份天数表
var DAY_OF_MONTH = [
    [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
];

//判断当前年是否闰年
var isLeapYear = function(year){
    if (year % 400 == 0 || (year % 4 == 0 && year % 100 != 0))
        return 1
    else
        return 0
};

//获取当月有多少天
var getDayCount = function(year, month){
    return DAY_OF_MONTH[isLeapYear(year)][month];
};

//获取当前索引下是几号
var getDay = function(index) {
    return index - curDayOffset;
};

//获取两个时间戳之间间隔的天数
var getOffDays = function(startDate, endDate) {  
    //得到时间戳相减 得到以毫秒为单位的差  
    var mmSec = (endDate.getTime() - startDate.getTime());
    //单位转换为天并返回 
    return (mmSec / 3600000 / 24); 
};  

var pageData = {
    dateData: {
        date: "",                //当前日期字符串
        arrIsShow: [],           //是否显示此日期
        arrDays: [],             //关于几号的信息
        arrDate: [],             //存储每月日期数据
        arrInfoEx: [],           //农历节假日等扩展信息
        arrInfoExShow: [],       //处理后用于显示的扩展信息
        rowNum: "",
    },

    //选择一天时显示的信息
    detailData: {
        curDay: "",         //detail中显示的日信息
        curInfo1: "",
        curInfo2: "",
    },

    todoData: {
        userInfo: {},
        strDate: "",
        showAll:true,
        lists:[],    
        newLi:{id:'',content:'',begin:util.formatTime2(),needRemind:true,editing:false,done:false},
        src: 'http://153.37.234.17/mp3.9ku.com/mp3/554/553534.mp3',
    }
}

//获取此月第一天相对视图显示的偏移
var getOffset = function()
{
    var offset = new Date(curYear, curMonth, 1).getDay();
    offset = offset == 0 ? 6 : offset - 1; //注意这个转换，Date对象的getDay函数返回返回值是 0（周日） 到 6（周六） 
    return offset;
}

//设置当前详细信息的索引，前台的详细信息会被更新
var refreshDetailData = function(index){
    var curEx = pageData.dateData.arrInfoEx[index];
    if (!curEx)
        return;
    curDay = curEx.sDay;
    pageData.detailData.curDay = curEx.sDay;
    pageData.detailData.curInfo1 = "农历" + curEx.lunarMonth + "月" + curEx.lunarDay + " " + curEx.lunarFestival;
    pageData.detailData.curInfo2 = curEx.cYear+curEx.lunarYear + "年 " + curEx.cMonth + "月 " + curEx.cDay + "日";
}

var refreshTodoData = function(index){
    var curDate = pageData.dateData.arrDate[index];
    var strDate = curDate.getFullYear() + "-" + (curDate.getMonth()+1) + "-" + curDate.getDate();
    pageData.todoData.strDate = strDate;
    
    try {
      var data = wx.getStorageSync(strDate);
      if(data){
        pageData.todoData.lists = data;
      }
      else {
        pageData.todoData.lists = [];
      }
      //wx.getStorageSync(strDate)({
            //key: strDate,
            //success: function(res) {
                //console.log(res.data[0]);
                //if(res.data){
                    ////pageData.todoData.strDate = strDate;
                    //pageData.todoData.lists = res.data;
                   //}
                //else {
                   // pageData.todoData.lists = [];
                //}
                //}
           // });
        console.log("Get: " + strDate);
    } catch(e) {
        console.log(e)
    }
     
        }

//刷新全部数据
var refreshPageData = function(year, month, day){
    curMonth = month;
    curYear = year;
    curDay = day;

    pageData.dateData.date = curYear + '年'+ (curMonth + 1) + '月';
    

    var offset = getOffset();
    var offset2 = getDayCount(curYear, curMonth) + offset;
    var isBlank = (offset2 % 7 > 0);
    var blankNum = (offset2/7 + isBlank) * 7;

    //动态计算当月日历显示行数；
    pageData.dateData.rowNum = "";
    for (var i = 1; i <= (offset2/7 + isBlank); i++ )
    {
        pageData.dateData.rowNum += String(i);
    }
    for (var i = 0; i < blankNum; ++i)
    {
        pageData.dateData.arrIsShow[i] = i < offset || i >= offset2 ? false : true;
        if (!pageData.dateData.arrIsShow[i])
            continue;
        pageData.dateData.arrDays[i] = i - offset + 1;
        var d = new Date(year, month, i - offset + 1);
        pageData.dateData.arrDate[i] = d;
        var dEx = calendarConverter.solar2lunar(d);
        pageData.dateData.arrInfoEx[i] = dEx;
        if ("" != dEx.lunarFestival)
        {
            pageData.dateData.arrInfoExShow[i] = dEx.lunarFestival;
        }
        else if ("初一" === dEx.lunarDay)
        {
            pageData.dateData.arrInfoExShow[i] = dEx.lunarMonth + "月";
        }
        else
        {
            pageData.dateData.arrInfoExShow[i] = dEx.lunarDay;
        }
    }

    refreshDetailData(offset + day - 1);
    refreshTodoData(offset + day - 1); 
};

var curDate = new Date();
var curMonth = curDate.getMonth();
var curYear = curDate.getFullYear();
var curDay = curDate.getDate();
refreshPageData(curYear, curMonth, curDay);


Page({
    data: pageData,
    onLoad: function() {
    },
    onShareAppMessage: function () {
        return {
            title: '日历',
            desc: '快速计算倒休情况，上班休假一目了然',
            path: '/pages/calendar/calendar'
        }
    },
    onReady: function (e) {
        this.audioCtx = wx.createAudioContext('myAudio');
        this.remind();
    },

    goToday: function(e){
        curDate = new Date();
        curMonth = curDate.getMonth();
        curYear = curDate.getFullYear();
        curDay = curDate.getDate();
        refreshPageData(curYear, curMonth, curDay);
        this.setData({
            dateData: pageData.dateData,
            detailData: pageData.detailData,
			todoData: pageData.todoData,
        })
    },

    goLastMonth: function(e){
        if (0 == curMonth)
        {
            curMonth = 11;
            --curYear
        }
        else
        {
            --curMonth;
        }
        refreshPageData(curYear, curMonth, 1);
        this.setData({
            dateData: pageData.dateData,
            detailData: pageData.detailData,
			      todoData: pageData.todoData,
        })
    },

    goNextMonth: function(e){
        if (11 == curMonth)
        {
            curMonth = 0;
            ++curYear
        }
        else
        {
            ++curMonth;
        }
        refreshPageData(curYear, curMonth, 1);
        this.setData({
            dateData: pageData.dateData,
            detailData: pageData.detailData,
			      todoData: pageData.todoData,
        })
    },

    selectDay: function(e){
        refreshDetailData(e.currentTarget.dataset.dayIndex);
        refreshTodoData(e.currentTarget.dataset.dayIndex); 
        this.setData({
            detailData: pageData.detailData,
			      todoData: pageData.todoData,
        })
    },

    bindDateChange: function(e){
        var arr = e.detail.value.split("-");
        refreshPageData(+arr[0], arr[1]-1, +arr[2]);
        this.setData({
            dateData: pageData.dateData,
            detailData: pageData.detailData,
			      todoData: pageData.todoData,
        })
    },

    toUrl(e){
        let url = e.target.dataset.url;
        wx.navigateTo({
        url:'../'+url+'/'+url
        })
    },

    iptChange(e){ 
        let strDate = this.data.todoData.strDate;
        this.setData({
            'todoData.strDate':strDate,
            'todoData.newLi.content':e.detail.value,
            'todoData.newLi.begin':util.formatTime2()
        })
    },

    formReset(){
        let strDate = this.data.todoData.strDate;  
        this.setData({
            'todoData.strDate':strDate,
            'todoData.newLi.content':''
        })
    },

    setStorageData(key,value){
        console.log("key: "+ key + " ,value: "+value);
        try {
            wx.setStorage({
                key:key,
                data:value
            })
        } catch(e) {
            console.log(e)
        }
    },

    formSubmit(){
        let newLists = this.data.todoData.lists,i = 0 ,newTodo = this.data.todoData.newLi;
        let strDate = this.data.todoData.strDate;
    
        if (newLists.length>0){
            i = Number(util.sortBy(newLists,'id',true)[0].id)+1;
        }
        newTodo.id = i;
        if (newTodo.content!=''){
            newLists.push(newTodo);
            this.setData({
                'todoData.strDate':strDate,
                'todoData.lists':newLists,
                'todoData.newLi':{id:'',content:'',begin:util.formatTime2(),needRemind:true,editing:false,done:false}
            }) ;
        }
        let listsArr = this.data.todoData.lists;
        //let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
        this.remind();
    },

    beginTime(e){
        let strDate = this.data.todoData.strDate;
        this.setData({
            'todoData.strDate':strDate,
            'todoData.newLi.begin': e.detail.value
        })
    },

    switch1Change(e){
        let strDate = this.data.todoData.strDate;
        this.setData({
        'todoData.strDate':strDate,
        'todoData.newLi.needRemind': e.detail.value
        })
    },

    //修改备忘录
    toChange(e){
        let i = e.target.dataset.id;
    
        this.setData({
            'todoData.lists':editArr(this.data.todoData.lists,i,{editing:true})
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    iptEdit(e){
        let i = e.target.dataset.id;
        this.setData({
            'todoData.lists':editArr(this.data.todoData.lists,i,{curVal:e.detail.value})
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    saveEdit(e){   
        let i = e.target.dataset.id;
        this.setData({
            'todoData.lists':editArr(this.data.todoData.lists,i,{content:this.data.todoData.lists[i].curVal,editing:false})
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    setDone(e){
        let i = e.target.dataset.id,newLists = this.data.todoData.lists;
        newLists.map(function(l,index){
            if (l.id == i){      
            newLists[index].done = !l.done;
            newLists[index].needRemind = false;
            }
        })  
        this.setData({
            'todoData.lists':newLists
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    toDelete(e){
        let i = e.target.dataset.id,newLists = this.data.todoData.lists;
        newLists.map(function(l,index){
            if (l.id == i){      
                newLists.splice(index,1);
            }
        })   
        this.setData({
            'todoData.lists':newLists
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    doneAll(){
        let newLists = this.data.todoData.lists;
        newLists.map(function(l){
            l.done = true;
        })   
        this.setData({
            'todoData.lists':newLists
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    deleteAll(){
        this.setData({
            'todoData.lists':[]      
        })
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        this.setStorageData(strDate,listsArr);
    },

    showUnfinished (){
        this.setData({
            'todoData.showAll':false
        })
    },

    showAll(){
        //显示全部事项
        this.setData({
            'todoData.showAll':true   
        })
    },

    /*saveData(){
        let listsArr = this.data.todoData.lists;
        let strDate = this.data.todoData.strDate;
        console.log("Save: " + strDate+"---"+listsArr[0]);
        
        this.setStorageData(strDate,listsArr);

        //try {
        //    wx.setStorage({
        //        key:strDate,
        //        data:listsArr
        //    })
        //} catch(e) {
        //    console.log(e)
        //}
        
    },*/

    audioPlay: function () {
        this.audioCtx.play()
    },

    audioPause: function () {
        this.audioCtx.pause()
    },

    audioStart: function () {
        this.audioCtx.seek(0)
    }, 

    getRemindArr(){
        let thisLists=this.data.todoData.lists,closeT=0,notDoneLists=[];
        let date = new Date(),now = [date.getHours(),date.getMinutes()];
        thisLists.map(function(l){
            if(l.needRemind){
                notDoneLists.push(l)
            }
        })
        if (notDoneLists.length>0){
            let newLists = util.sortBy(notDoneLists,'begin'),firstT = (newLists[0].begin).split(':') ,id = newLists[0].id,cnt = newLists[0].content;   
            closeT = ((firstT[0]-now[0])*60+(firstT[1]-now[1])-1)*60;
            closeT = closeT>=0?closeT:0;
            return {closeT,id,cnt};
        }else{
            return false;
        }    
    }, 

    remind(){    
        let result=this.getRemindArr(), t = result.closeT,id = result.id,that=this,cnt = result.cnt;
        function alarm(){
            that.audioPlay();
            let newLists = that.data.todoData.lists;
            wx.showModal({
                title: '马上去做吧',
                content: cnt,            
                success: function(res) {
                    if (res.confirm) {
                        that.audioPause();
                        that.audioStart();
                        newLists.map(function(l,index){
                            if (l.id == id){      
                                newLists[index].done = true; 
                                newLists[index].needRemind = false; 
                            }
                        })  
                        that.setData({
                            'todoData.lists':newLists
                        })
                    }else{
                        that.audioPause();
                        that.audioStart();
                        newLists.map(function(l,index){
                            if (l.id == id){      
                                newLists[index].needRemind = false; 
                            }
                        })  
                        that.setData({
                            'todoData.lists':newLists
                        })
                    }
                }
            })

        }
        if(result){      
            setTimeout(alarm,Math.floor(t*1000),function(){
                that.remind();
            })
        }
    
    }
});