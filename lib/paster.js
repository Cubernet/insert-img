'use babel';

var environment = require('atom');
var File = environment.File;
var Directory = environment.Directory;
var fs = require("fs");
var clipboard = require('clipboard');
var crypto = require("crypto");
var qiniu = require("qiniu");
var nativeImage = require('electron').nativeImage

module.exports = {
    paste: function () {
        // console.log("paste image");
        var editor = atom.workspace.getActiveTextEditor();
        console.log(editor);
        var grammar, img;
        if (!editor) {
            return;
        }
        grammar = editor.getGrammar();
        if (!grammar) {
            return;
        }
        if (grammar.scopeName !== 'text.md' && grammar.scopeName !== 'text.gfm' && grammar.scopeName !== 'source.gfm') {
            return;
        }
        //判断是否仅对md文件进行操作
        if ((editor.getPath().substr(-3) !== '.md') && (atom.config.get('insert-img.isMarkdown'))) {
            return;
        }

        img = clipboard.readImage();
        if (img.isEmpty()) {
            var path = atom.clipboard.read();
            if (fs.existsSync(path)) {
                img = nativeImage.createFromPath(path);
            }

            console.log(img)
            if (img.isEmpty()) {
                // console.log("paste image: clipboard.readImage empty");
                return;
            }
        }

        var assetsPath,  //assets文件夹地址
            mdFile;
        mdFile = new File(editor.getPath());
			  assetsPath = mdFile.getParent().getPath() + "/assets";

        //文件保存
        var md5 = crypto.createHash('md5');
        var imgbuffer = img.toPNG();
        md5.update(imgbuffer);
        var filename = "" + (mdFile.getBaseName().replace(/\.\w+$/, '').replace(/\s+/g, '').split('-')[0]) +
            "-" + (md5.digest('hex').slice(0, 8)) + ".png";

        // console.log("paste image filename:" + filename) ;
        this.createDirectory(assetsPath + '/', function () {
            fs.writeFile(assetsPath + '/' + filename, imgbuffer, 'binary', function () {
                atom.notifications.addSuccess('Image ' + filename + ' was created in ' + assetsPath);
                var pastepath = '';
                if(atom.config.get('insert-img.isQiniu')){
                  //上传到七牛
                  var qiniuAK = atom.config.get('insert-img.qiniuAK');
                  var qiniuSK = atom.config.get('insert-img.qiniuSK');
                  var qiniuBucket = atom.config.get('insert-img.qiniuBucket');
                  var qiniuDomain = atom.config.get('insert-img.qiniuDomain');

                  //需要填写你的 Access Key 和 Secret Key
                  qiniu.conf.ACCESS_KEY = qiniuAK;
                  qiniu.conf.SECRET_KEY = qiniuSK;

                  //要上传的空间
                  bucket = qiniuBucket;

                  //上传到七牛后保存的文件名
                  key = filename;

                  //构建上传策略函数
                  function uptoken(bucket, key) {
                    // var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
                    var putPolicy = new qiniu.rs.PutPolicy({scope: bucket+":"+key});

                    //return putPolicy.token();
                    return putPolicy.uploadToken();
                  }

                  //生成上传 Token
                  token = uptoken(bucket, key);

                  //要上传文件的本地路径sudo apt install xclip
                  filePath = assetsPath + "/" +filename;

                  //构造上传函数
                  function uploadFile(uptoken, key, localFile) {

                      //var localFile = "/Users/jemy/Documents/qiniu.mp4";
                      var formUploader = new qiniu.form_up.FormUploader();
                      var extra = new qiniu.form_up.PutExtra();
                      // var key='test.mp4';
                      // 文件上传
                      formUploader.putFile(uptoken, key, localFile, extra, function(respErr,
                      respBody, respInfo) {
                      if (respErr) {
                        throw respErr;
                      }

                      if (respInfo.statusCode == 200) {
                        console.log(respBody);
                      } else {
                        console.log(respInfo.statusCode);
                        console.log(respBody);
                      }
                      });

                    //   var extra = new qiniu.form_up.PutExtra();
                    //   qiniu.form_up.putFile(uptoken, key, localFile, extra, function(err, ret) {
                    //     if(!err) {
                    //       // 上传成功， 处理返回值
                    //       console.log(ret.hash, ret.key, ret.persistentId);
                    //     } else {
                    //       // 上传失败， 处理返回代码
                    //       console.log(err);
                    //     }
                    // });
                  }
                  //调用uploadFile上传
                  uploadFile(token, key, filePath);
                  pastepath = 'http://' + qiniuDomain + '/' +  filename;
                }
                else {
                  pastepath = "assets/" + filename;
                }
                editor.insertText("![](" + pastepath + ")", editor);
            });
        });

    },
    createDirectory: function (dirPath, callback) {
        var that = this;
        var assetsDir;
        assetsDir = new Directory(dirPath);
        assetsDir.exists().then(function (existed) {
            if (!existed) {
                assetsDir.create().then(function (created) {
                    if (created) {
                        callback();
                    }
                });
            } else {
                callback();
            }
        });
    },
};
