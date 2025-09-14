const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = require("@azure/storage-blob");

const CONN = process.env.AZURE_STORAGE_CONNECTION_STRING;
const PROFILE_CONTAINER =
  process.env.AZURE_STORAGE_CONTAINER_NAME || "profilepics";
const UPLOADS_CONTAINER =
  process.env.AZURE_STORAGE_UPLOADS_CONTAINER || "chat-uploads";

function parseConnString(cs) {
  const name = /AccountName=([^;]+)/.exec(cs)?.[1];
  const key = /AccountKey=([^;]+)/.exec(cs)?.[1];
  if (!name || !key) throw new Error("Invalid AZURE_STORAGE_CONNECTION_STRING");
  return { accountName: name, accountKey: key };
}

const { accountName, accountKey } = parseConnString(CONN);
const sharedKey = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = BlobServiceClient.fromConnectionString(CONN);

async function ensureContainer(name, publicAccess = "blob") {
  const c = blobServiceClient.getContainerClient(name);
  await c.createIfNotExists({ access: publicAccess }); // for dev. For prod, drop 'access'
  return c;
}

async function getWriteSAS({
  containerName,
  blobName,
  contentType,
  minutes = 15,
}) {
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + minutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"), // create + write
      startsOn,
      expiresOn,
      contentType,
    },
    sharedKey
  ).toString();

  const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(
    blobName
  )}?${sas}`;
  const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(
    blobName
  )}`;

  return { uploadUrl, blobUrl, expiresOn };
}

module.exports = {
  blobServiceClient,
  PROFILE_CONTAINER,
  UPLOADS_CONTAINER,
  ensureContainer,
  getWriteSAS,
};
