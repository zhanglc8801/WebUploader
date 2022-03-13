using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Test_1.Controllers
{
    public class HomeController : Controller
    {
        /// <summary>
        /// 文件存放路径
        /// </summary>
        const string UploadFiles = "/Upload";

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Image()
        {
            return View();
        }

        public ActionResult Demo1()
        {
            return View();
        }

        public ActionResult Demo2()
        {
            return View();
        }

        public ActionResult Demo3()
        {
            return View();
        }

        public ActionResult Demo4()
        {
            return View();
        }


        //===========================用于Index页面调用===
        [HttpPost]
        public ActionResult CheckFileExist()
        {
            var md5 = Request["md5"];
            var dir = Server.MapPath(UploadFiles);
            dir = Path.Combine(dir, md5);//临时保存分块的目录

            int chunk=Directory.GetFiles(dir).Length-1;

            return null;
        }

        [HttpPost]
        public ActionResult Upload()
        {
            string id = Request["id"];
            string md5 = Request["md5"];

            string fileName = Request["name"];//webuploader-v0.1.6.js Line:4049 配置默认的上传字段
            int index = Convert.ToInt32(Request["chunk"]);//当前分块序号
            //var guid = Request["guid"];//前端传来的GUID号
            var dir = Server.MapPath(UploadFiles);//文件上传目录
            dir = Path.Combine(dir, md5);//临时保存分块的目录
            if (!System.IO.Directory.Exists(dir))
                System.IO.Directory.CreateDirectory(dir);
            string filePath = Path.Combine(dir, index.ToString());//分块文件名为索引名，更严谨一些可以加上是否存在的判断，防止多线程时并发冲突
            var data = Request.Files["file"];//表单中取得分块文件
            if (data != null)//为null可能是暂停的那一瞬间
            {
                data.SaveAs(filePath);//报错
            }
            return Json(new { filepath = filePath,code=1 });//Demo，随便返回了个值，请勿参考
        }
        public ActionResult Merge()
        {
            //var guid = Request["guid"];//GUID
            string md5 = Request["md5"];
            var uploadDir = Server.MapPath("~/Upload");//Upload 文件夹
            var dir = Path.Combine(uploadDir, md5);//临时文件夹
            var fileName = Request["fileName"];//文件名
            var files = System.IO.Directory.GetFiles(dir);//获得下面的所有文件
            var finalPath = Path.Combine(uploadDir, md5+Path.GetExtension(fileName));//最终的文件名（demo中保存的是它上传时候的文件名，实际操作肯定不能这样）
            var fs = new FileStream(finalPath, FileMode.Create);
            foreach (var part in files.OrderBy(x => x.Length).ThenBy(x => x))//排一下序，保证从0-N Write
            {
                var bytes = System.IO.File.ReadAllBytes(part);
                fs.Write(bytes, 0, bytes.Length);
                bytes = null;
                System.IO.File.Delete(part);//删除分块
            }
            fs.Flush();
            fs.Close();
            System.IO.Directory.Delete(dir);//删除文件夹
            return Json(new { error = 0,filepath= finalPath });//随便返回个值，实际中根据需要返回
        }

    }
}