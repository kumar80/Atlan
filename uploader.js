class uploader {
    constructor ({file,progress}) {
        this.file = file;
        this.progress = progress;
        this.fileId = file.name + '_' + file.lastModifiedDate;
    }

    async uploadStatus(){
        let res  = await fetch('status',{headers :{ 'file-id' : this.fileId} });
        if(res.status!=200){
            throw new Error(res.statusText);
        }
        let txt = await res.text();
        return  +txt;
    }

    async upload(){
        this.start = await this.uploadStatus();
        let req = this.req = new XMLHttpRequest();
        req.open("POST","upload",true);
        req.setRequestHeader('file-id',this.fileId);
        req.setRequestHeader('start',this.start);
        req.upload.onprogress = (event) =>{
                this.progress(this.start + event.loaded,this.start + event.total);
        }
        req.send(this.file.slice(this.start));

        return await new Promise((res,rej)=>{
            req.onload = req.onerror = ()=> {
                if(req.status == 200) res(true);
                else 
                    rej(new Error(req.statusText));
            }
            req.onabort = ()=>res(false);
        })
    }
    stop() {
        if(this.req) this.req.abort();
    }
}