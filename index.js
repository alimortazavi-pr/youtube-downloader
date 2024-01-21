const youtubedl = require("youtube-dl-exec");
const logger = require("progress-estimator")();
const fs = require("fs");
const { mkdirp } = require("mkdirp");
var prompt = require("prompt-sync")();

function complete(commands) {
  return function (str) {
    var i;
    var ret = [];
    for (i = 0; i < commands.length; i++) {
      if (commands[i].indexOf(str) == 0) ret.push(commands[i]);
    }
    return ret;
  };
}

const downloadSingleVideo = async (videoUrl, dir) => {
  const dlVideo = youtubedl(
    videoUrl,
    {
      recodeVideo: "mp4",
    },
    {
      cwd: dir,
    }
  );
  await logger(dlVideo, `Obtaining ${videoUrl}`);
};

const downloadSinglePlaylist = async (playlistUrl, dir) => {
  const playlist = youtubedl(playlistUrl, {
    flatPlaylist: true,
    getId: true,
  });
  await logger(playlistUrl, `Obtaining ${playlistUrl}`);
  const playlistArray = await [
    ...(await playlist).replace(/\n/g, ",").split(","),
  ];
  await mkdirp.sync(dir + "/" + "single-playlist");
  for (videoId of playlistArray) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const dlVideo = youtubedl(
      videoUrl,
      {
        recodeVideo: "mp4",
      },
      {
        cwd: dir + `/single-playlist`,
      }
    );
    await logger(dlVideo, `Obtaining ${videoUrl}`);
  }
};

const downloadAllPlaylists = async (playlistsUrl, dir) => {
  let ex = {};

  const playlists = youtubedl(playlistsUrl, {
    flatPlaylist: true,
    getId: true,
    getTitle: true,
  });
  await logger(playlists, `Obtaining ${playlistsUrl}`);
  const playlistsArray = [...(await playlists).replace(/\n/g, ",").split(",")];
  let idWithTitlesPlaylistsArray = [];
  for (let i = 0; i < playlistsArray.length; i++) {
    if (i % 2 == 0) {
      await idWithTitlesPlaylistsArray.push([playlistsArray[i]]);
    } else {
      await idWithTitlesPlaylistsArray[
        idWithTitlesPlaylistsArray.length - 1
      ].push(playlistsArray[i]);
    }
  }
  for (playlistIdAndTitle of idWithTitlesPlaylistsArray) {
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistIdAndTitle[1]}`;
    const playlist = youtubedl(playlistUrl, {
      flatPlaylist: true,
      getId: true,
    });
    await logger(playlistUrl, `Obtaining ${playlistUrl}`);
    const playlistArray = await [
      ...(await playlist).replace(/\n/g, ",").split(","),
    ];
    let videosUrl = [];
    await mkdirp.sync(dir + "/" + playlistIdAndTitle[0]);
    for (videoId of playlistArray) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      videosUrl.push(videoUrl);
      const dlVideo = youtubedl(
        videoUrl,
        {
          recodeVideo: "mp4",
        },
        {
          cwd: dir + `/${playlistIdAndTitle[0]}`,
        }
      );
      await logger(dlVideo, `Obtaining ${videoUrl}`);
    }
    ex[playlistUrl] = await videosUrl;
    videosUrl = [];
  }
  fs.writeFileSync("export.txt", JSON.stringify(ex));
  fs.writeFileSync("export.json", JSON.stringify(ex));
};

let typeOfDownload = prompt(
  "1 - Single video\n2 - Single playlist\n3 - All playlists\n9 - exit\nType of download: "
);
let dir = prompt("dir: ");

try {
  if (typeOfDownload == 3) {
    const playlistsUrl = prompt(
      "Playlists URL ('https://www.youtube.com/@Ninja/playlists'): "
    );
    downloadAllPlaylists(playlistsUrl, dir);
  } else if (typeOfDownload == 2) {
    const playlistUrl = prompt(
      "Playlist URL ('https://www.youtube.com/playlist?list=PL_LvhWhUYJCy5Vmwo-rUAzewLlO0kAKtq'): "
    );
    downloadSinglePlaylist(playlistUrl, dir);
  } else if (typeOfDownload == 1) {
    const videoUrl = prompt(
      "Video URL ('https://www.youtube.com/watch?v=6Dh-RL__uN4'): "
    );
    downloadSingleVideo(videoUrl, dir);
  } else if (typeOfDownload == 9) {
    console.log("Exiting...");
    process.exit(1);
  } else {
    console.log("Invalid option.");
    process.exit(1);
  }
} catch (err) {
  console.log(err.message);
}
