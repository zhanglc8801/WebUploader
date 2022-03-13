(function ($) {
    var INTEROP_PATH = {
        //swf所在路径
        swf: '/lib/webuploader/Uploader.swf',
        //处理文件上传的地址
        server: '/FileUpload/Upload',
        //获取已上传文件的块数量
        GetMaxChunk: '/FileUpload/GetMaxChunk',
        //进行文件合并的地址
        MergeFiles: "/FileUpload/MergeFiles"
    };

    // 当domReady的时候开始初始化
    $(function () {
        var $wrap = $('#uploader'),

            // 图片容器
            $queue = $("#file-panel"),

            // 上传按钮
            $upload = $wrap.find('.uploadBtn'),

            // 没选择文件之前的内容。
            $progress = $('.progress'),// $('.progress').hide(),

            // 添加的文件数量
            fileCount = 0,
            // 添加的文件总大小
            fileSize = 0,

            // 优化retina, 在retina下这个值是2
            ratio = window.devicePixelRatio || 1,

            // 可能有pedding, ready, uploading, confirm, done.
            state = 'pedding',

            // 所有文件的进度信息，key为file id
            percentages = {},
            // 判断浏览器是否支持图片的base64
            isSupportBase64 = (function () {
                var data = new Image();
                var support = true;
                data.onload = data.onerror = function () {
                    if (this.width != 1 || this.height != 1) {
                        support = false;
                    }
                };
                data.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                return support;
            })(),

            // 检测是否已经安装flash，检测flash的版本
            flashVersion = (function () {
                var version;
                try {
                    version = navigator.plugins['Shockwave Flash'];
                    version = version.description;
                } catch (ex) {
                    try {
                        version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash')
                            .GetVariable('$version');
                    } catch (ex2) {
                        version = '0.0';
                    }
                }
                version = version.match(/\d+/g);
                return parseFloat(version[0] + '.' + version[1], 10);
            })(),

            supportTransition = (function () {
                var s = document.createElement('p').style,
                    r = 'transition' in s ||
                        'WebkitTransition' in s ||
                        'MozTransition' in s ||
                        'msTransition' in s ||
                        'OTransition' in s;
                s = null;
                return r;
            })(),

            // WebUploader实例
            uploader,
            GUID = WebUploader.Base.guid(); //当前页面是生成的GUID作为标示

        if (!WebUploader.Uploader.support('flash') && WebUploader.browser.ie) {
            // flash 安装了但是版本过低。
            if (flashVersion) {
                (function (container) {
                    window['expressinstallcallback'] = function (state) {
                        switch (state) {
                            case 'Download.Cancelled':
                                alert('您取消了更新！');
                                break;

                            case 'Download.Failed':
                                alert('安装失败');
                                break;

                            default:
                                alert('安装已成功，请刷新！');
                                break;
                        }
                        delete window['expressinstallcallback'];
                    };

                    var swf = 'Scripts/expressInstall.swf';
                    // insert flash object
                    var html = '<object type="application/' +
                        'x-shockwave-flash" data="' + swf + '" ';

                    if (WebUploader.browser.ie) {
                        html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
                    }

                    html += 'width="100%" height="100%" style="outline:0">' +
                        '<param name="movie" value="' + swf + '" />' +
                        '<param name="wmode" value="transparent" />' +
                        '<param name="allowscriptaccess" value="always" />' +
                        '</object>';
                    container.html(html);
                })($wrap);

                // 压根就没有安装。
            } else {
                $wrap.html('<a href="http://www.adobe.com/go/getflashplayer" target="_blank" border="0"><img alt="get flash player" src="http://www.adobe.com/macromedia/style_guide/images/160x41_Get_Flash_Player.jpg" /></a>');
            }

            return;
        } else if (!WebUploader.Uploader.support()) {
            alert('Web Uploader 不支持您的浏览器！');
            return;
        }

        // 实例化
        uploader = WebUploader.create({
            pick: {
                id: '#filePicker',
                label: '选择文件'
            },
            formData: {
                uid: 123
            },
            paste: '#uploader',
            swf: INTEROP_PATH.swf,
            chunked: true, //分片处理大文件
            chunkSize: 2 * 1024 * 1024,
            //duplicate: true,//允许上传同一文件 https://my.oschina.net/zchuanzhao/blog/757311
            server: INTEROP_PATH.server,
            disableGlobalDnd: true,
            threads: 2, //上传并发数
            //由于Http的无状态特征，在往服务器发送数据过程传递一个进入当前页面是生成的GUID作为标示
            formData: {},
            fileNumLimit: 10,
            compress: false, //图片在上传前不进行压缩
            fileSizeLimit: 1024 * 1024 * 1024 * 1024,    // 1024 G
            fileSingleSizeLimit: 1024 * 1024 * 1024 * 1024    // 1024 G
        });
        var IsHaveFile = false;
        uploader.on('fileQueued', function (file) {
            uploader.md5File(file)
                // 及时显示进度
                .progress(function (percentage) {
                    $(".progress_check").html("正在验证文件..." + parseInt(percentage * 100) + "%").css('color', '#aaa');
                    //if (percentage == 1) {
                    //    //$(".progress_check").hide();
                    //    $(".progress_check").html("验证完成，等待上传").css('color', '#aaa');
                    //}
                })

                // 完成
                .then(function (val) {
                    console.info('from data:', uploader.options.formData);
                    console.info('md5 result:', val, file);
                    var temp_obj = {};
                    var temp_key = file.id + "md5";
                    temp_obj[temp_key] = val;
                    $.extend(uploader.options.formData, temp_obj);
                    $.ajax({
                        url: INTEROP_PATH.GetMaxChunk,
                        async: true,
                        data: { md5: val, ext: file.ext },
                        success: function (response) {
                            console.info('response', response);
                            var res = JSON.parse(response);
                            var data = JSON.parse(res.data);
                            //$.extend(uploader.options.formData, { chunk: res.chunk });
                            if (data.HaveFile == "1") {
                                IsHaveFile = true;
                                Global.FileQueueds.push({ id: file.id, md5: val, size: file.size, ext: file.ext, chunk: data.chunk, savePath: data.savePath, HaveFile: '1' });
                            }
                            else {
                                IsHaveFile = false;
                                Global.FileQueueds.push({ id: file.id, md5: val, size: file.size, ext: file.ext, chunk: data.chunk, savePath: data.savePath, HaveFile: '0' });
                            }   
                            console.info('fileCheckMaxChunk', file, res.data);
                            $('.progress_check').attr('data-checkedcomplete', true).text('验证完成，等待上传').css('color', '#aaa');
                            $("#filePicker2").attr("style", "");
                            ////文件验证完成后自动触发上传
                            //uploader.upload();
                            //alert(decodeURIComponent(data.savePath));
                            //alert(data.HaveFile);
                        }
                    });
                });

        });

        var HasFile;
        uploader.on('dialogOpen', function () {
            //if (fileCount == 1) {
            //    removeFile(HasFile);
            //}
        });

        uploader.on('ready', function () {
            window.uploader = uploader;
        });

        // 当有文件添加进来时执行，负责view的创建
        function addFile(file) {
            $(".progress").css('height', '0px').css('margin-top', '0px');
            HasFile = file;
            var $li = $("#file-panel"),
                $prgress = $li.find('p.progress span');
            $(".title").text(file.name);

            $queue.find('.progress_check').show();
            $prgress.hide().width(0);

            if (file.getStatus() === 'invalid') {
                showError(file.statusText);
            } else {
                // @todo lazyload
                percentages[file.id] = [file.size, 0];
                file.rotation = 0;
            }

            file.on('statuschange', function (cur, prev) {
                if (prev === 'progress') {
                    //$prgress.hide().width(0);//暂停及完成时隐藏进度条
                } else if (prev === 'queued') {
                    $li.off('mouseenter mouseleave');
                }
                // 成功
                if (cur === 'error' || cur === 'invalid') {
                    console.log(file.statusText);
                    showError(file.statusText);
                    percentages[file.id][1] = 1;
                } else if (cur === 'interrupt') {
                    showError('interrupt');
                } else if (cur === 'queued') {
                    $prgress.css('display', 'block');
                    percentages[file.id][1] = 0;
                } else if (cur === 'progress') {
                    $prgress.css('display', 'block');
                } else if (cur === 'complete') {
                    //$prgress.hide().width(0);
                }
                $li.removeClass('state-' + prev).addClass('state-' + cur);
            });
            $li.appendTo($queue);
        }

        // 负责view的销毁
        function removeFile(file) {
            var $li = $('#' + file.id);
            delete percentages[file.id];
            updateTotalProgress();
            $li.off().find('.file-panel').off().end().remove();
        }

        function updateTotalProgress() {
            var loaded = 0,
                total = 0,
                spans = $progress.children(),
                percent;

            $.each(percentages, function (k, v) {
                total += v[0];
                loaded += v[0] * v[1];
            });
            percent = total ? loaded / total : 0;
            spans.eq(0).text(Math.round(percent * 100) + '%');
            spans.eq(1).css('width', Math.round(percent * 100) + '%');
            updateStatus();
        }

        function updateStatus() {
            var text = '', stats;
            if (state === 'ready') {

            } else if (state === 'confirm') {
                stats = uploader.getStats();
            } else {
                stats = uploader.getStats();
            }
        }

        function setState(val) {
            var file, stats;
            if (val === state) {
                return;
            }
            //$upload.removeClass('state-' + state);
            //$upload.addClass('state-' + val);
            state = val;

            switch (state) {
                case 'pedding':
                    $queue.hide();
                    uploader.refresh();
                    break;

                case 'ready':
                    //$('#filePicker2').removeClass('element-invisible');
                    $queue.show();
                    uploader.refresh();
                    break;

                case 'uploading':
                    //$('#filePicker2').addClass('element-invisible');
                    //$progress.show();
                    $("#filePicker2").text('暂停上传');
                    break;

                case 'paused':
                    $.each(uploader.getFiles(), function (idx, row) {
                        if (row.getStatus() == "progress") {
                            row.setStatus('interrupt');
                        }
                    });
                    //uploader.getFiles()[0].setStatus('interrupt');
                    //$progress.show();
                    $upload.text('继续上传');
                    break;

                case 'confirm':
                    //$progress.hide();
                    //$('#filePicker2').removeClass('element-invisible');
                    $upload.text('开始上传');
                    stats = uploader.getStats();
                    if (stats.successNum && !stats.uploadFailNum) {
                        setState('finish');
                        return;
                    }
                    break;
                case 'finish':
                    stats = uploader.getStats();
                    if (stats.successNum) {
                        //console.info('finish', uploader, stats);
                        ////alert('上传完成');
                        //if (window.UploadSuccessCallback) {
                        //    window.UploadSuccessCallback();
                        //}
                    } else {
                        // 没有成功的图片，重设
                        state = 'done';
                        location.reload();
                    }
                    break;
            }
            updateStatus();
        }

        uploader.onUploadProgress = function (file, percentage) {
            var $percent = $('.progress span');
            $percent.css('width', percentage * 100 + '%');
            percentages[file.id][1] = percentage;
            updateTotalProgress();
        };

        uploader.onFileQueued = function (file) {
            fileCount++;
            fileSize += file.size;

            if (fileCount === 1) {
                //$placeHolder.addClass('element-invisible');
            }
            
            addFile(file);
            setState('ready');
            updateTotalProgress();
        };

        uploader.onFileDequeued = function (file) {
            fileCount--;
            fileSize -= file.size;
            if (!fileCount) {
                setState('pedding');
            }
            removeFile(file);
            updateTotalProgress();
        };

        //all算是一个总监听器
        uploader.on('all', function (type, arg1, arg2) {
            //console.log("all监听：", type, arg1, arg2);
            var stats;
            switch (type) {
                case 'uploadFinished':
                    setState('confirm');
                    break;
                case 'startUpload':
                    setState('uploading');
                    break;
                case 'stopUpload':
                    setState('paused');
                    break;
            }
        });

        // 文件上传成功,合并文件。
        uploader.on('uploadSuccess', function (file, response) {
            console.info('uploadSuccess', file, response);

            //alert(file.aaa);

            if (response && response.code >= 0) {
                var dataObj = JSON.parse(response.data);
                var md5 = Global.GetFileQueued(file.id).md5;
                var savePath = dataObj.savePath;
                //alert(dataObj.chunked);
                //alert(dataObj.savePath);
                if (dataObj.chunked) {
                    $.post(INTEROP_PATH.MergeFiles, { md5: md5, ext: dataObj.ext },
                        function (data) {
                            data = $.parseJSON(data);
                            //var ddd = JSON.parse(data.data);
                            //alert(decodeURIComponent(ddd.savePath));

                            if (data.hasError) {
                                alert('文件合并失败！');
                            } else {
                                console.info('上传文件完成并合并成功，触发回调事件');
                                if (window.UploadSuccessCallback) {
                                    window.UploadSuccessCallback(file, md5, savePath);
                                }
                            }
                        });
                }
                else {
                    console.info('上传文件完成，不需要合并，触发回调事件');
                    if (window.UploadSuccessCallback) {
                        window.UploadSuccessCallback(file, md5, savePath);
                    }
                }
            }
        });

        uploader.onError = function (code) {
            if (code=="Q_EXCEED_SIZE_LIMIT") {
                alert("文件大小超出限制");
            }
            else {
                alert('Eroor: ' + code);
            }
            
        };

        $upload.on('click', function () {
            if ($(this).hasClass('disabled')) {
                return false;
            }
            if ($queue.find('.progress_check[data-checkedcomplete=false]').length > 0) {
                alert('请等待文件验证完成');
                return false;
            }
            else {
                $queue.find('.progress_check').hide();
            }

            //if (IsHaveFile == true) {
                
            //}

            if (state === 'ready') {
                $(".progress").css('height', '10px').css('margin-top','5px');
                uploader.upload();
            } else if (state === 'paused') {
                $(".progress").css('height', '10px').css('margin-top', '5px');
                uploader.upload();
            } else if (state === 'uploading') {
                $(".progress").css('height', '0px').css('margin-top', '0px');
                uploader.stop();
            }
        });
        $upload.addClass('state-' + state);
        updateTotalProgress();
    });

})(jQuery);
