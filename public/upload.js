let link;
let config1 =(data )=> ({
    method: "post",
    url: "https://api.vimeo.com/me/videos",
    headers: {
      Authorization: "bearer 5ff7458255cbe0093af3f360014c1822",
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    data: data,
  });
  let getLinkStep1 = async (out) => {
    link = await out.data.upload.upload_link;
    console.log( 'getting link ', link);
    return link;
  };
  let config2 = async (file, link) => ({
    method: "patch",
    url: link,
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    data: file,
  });
  let config3 = (link) => ({
    method: "head",
    url: link,
    headers: {
      "Tus-Resumable": "1.0.0",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

let up=async (chunks) => {
  let blob = new Blob(chunks, { type: "video/mp4;" });
  //const obj = { hello: "world" };
  //const blob = new Blob([JSON.stringify(obj, null, 2)], {type: "application/json"});
  //let n = (await blob.arrayBuffer()).byteLength
  //console.log(n)
  //return 
  let videobuffer = await blob.arrayBuffer();

  let data = JSON.stringify({
    upload: { approach: "tus", size: videobuffer.byteLength },
  });
  let out1 = await axios(config1(data))
  let link =await getLinkStep1(out1)
  console.log(link)
  let out2 = await axios(config2(videobuffer,link))
  console.log(out2)
  let out3 = await axios(config3(link));
  console.log(out3)

};


// Exporting variables and functions
export default up;
