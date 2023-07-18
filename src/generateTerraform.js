const fs = require('fs')

// Input: EP_CONFIG
// Output:
//    1. Topics in JSON format. See confluent example
//    2. ACLs in HCL format - Terraform Resource

try {
  const target_messaging_service = process.env.SOLACE_MESSAGING_SERVICE || "DEV-Kafka"
  const EP_CONFIG = JSON.parse(fs.readFileSync(`ep-config/${target_messaging_service}.json`, 'utf8'))

  // Generate topic terraform configuration file
  generate_topic_list_msk(EP_CONFIG)
  generate_topic_list_kafka(EP_CONFIG)
 
  // Generate Terraform Resource configuration file
  generate_hcl_json_msk(EP_CONFIG)


} catch (err) {
  console.error(err);
}

function generate_topic_list_msk(EP_CONFIG) {
  topic_list = {}
  EP_CONFIG.events.map(event =>{
    topic_list[event.topic] = {
      config: generate_topic_config(event.runtime_config),
      replication_factor: event.runtime_config.kafkaTopic.partitions[0].isrCount,
      partitions_count: event.runtime_config.kafkaTopic.partitions[0].isrCount
    }
  })
  fs.writeFile(`terraform-config/${EP_CONFIG.target_messaging_service.name}_topic_list_msk.json`, JSON.stringify(topic_list, null, 2), (err) => {
    if (err) throw err;
   });
}

function generate_topic_list_kafka(EP_CONFIG) {
  topic_list = {}
  EP_CONFIG.events.map(event =>{
    topic_list[event.topic] = {
      config: generate_topic_config(event.runtime_config),
      partitions_count: event.runtime_config.kafkaTopic.partitions[0].isrCount
    }
  })
  fs.writeFile(`terraform-config/${EP_CONFIG.target_messaging_service.name}_topic_list_kafka.json`, JSON.stringify(topic_list, null, 2), (err) => {
    if (err) throw err;
   });
}

function generate_topic_config(runtime_config){
  let config =  {
      "compression.type": runtime_config.kafkaTopic['compression.type'] ? runtime_config.kafkaTopic['compression.type'].toString() : null,
			"leader.replication.throttled.replicas": runtime_config.kafkaTopic['leader.replication.throttled.replicas'] ? runtime_config.kafkaTopic['leader.replication.throttled.replicas'].toString() : null,
			"message.downconversion.enable": runtime_config.kafkaTopic['message.downconversion.enable'] ? runtime_config.kafkaTopic['message.downconversion.enable'].toString() : null,
			"min.insync.replicas": runtime_config.kafkaTopic['min.insync.replicas'] ? runtime_config.kafkaTopic['min.insync.replicas'].toString() : null,
			"segment.jitter.ms": runtime_config.kafkaTopic['segment.jitter.ms'] ? runtime_config.kafkaTopic['segment.jitter.ms'].toString() : null,
			"cleanup.policy": runtime_config.kafkaTopic['cleanup.policy'] ? runtime_config.kafkaTopic['cleanup.policy'].toString() : null,
			"flush.ms": "9223372036854775807",
			// "flush.ms": runtime_config.kafkaTopic['flush.ms'] ? runtime_config.kafkaTopic['flush.ms'].toString() : null,
			"follower.replication.throttled.replicas": runtime_config.kafkaTopic['follower.replication.throttled.replicas'] ? runtime_config.kafkaTopic['follower.replication.throttled.replicas'].toString() : null,
			"segment.bytes": runtime_config.kafkaTopic['segment.bytes'] ? runtime_config.kafkaTopic['segment.bytes'].toString() : null,
			"retention.ms": runtime_config.kafkaTopic['retention.ms'] ? runtime_config.kafkaTopic['retention.ms'].toString() : null,
			"flush.messages": "9223372036854775807",
			// "flush.messages": runtime_config.kafkaTopic['flush.messages'] ? runtime_config.kafkaTopic['flush.messages'].toString() : null,
			"message.format.version": runtime_config.kafkaTopic['message.format.version'] ? runtime_config.kafkaTopic['message.format.version'].toString() : null,
			"max.compaction.lag.ms": "9223372036854775807",
			// "max.compaction.lag.ms": runtime_config.kafkaTopic['max.compaction.lag.ms'] ? runtime_config.kafkaTopic['max.compaction.lag.ms'].toString() : null,
			"file.delete.delay.ms": runtime_config.kafkaTopic['file.delete.delay.ms'] ? runtime_config.kafkaTopic['file.delete.delay.ms'].toString() : null,
			"max.message.bytes": runtime_config.kafkaTopic['max.message.bytes'] ? runtime_config.kafkaTopic['max.message.bytes'].toString() : null,
			"min.compaction.lag.ms": runtime_config.kafkaTopic['min.compaction.lag.ms'] ? runtime_config.kafkaTopic['min.compaction.lag.ms'].toString() : null,
			"message.timestamp.type": runtime_config.kafkaTopic['message.timestamp.type'] ? runtime_config.kafkaTopic['message.timestamp.type'].toString() : null,
			"preallocate": runtime_config.kafkaTopic['preallocate'] ? runtime_config.kafkaTopic['preallocate'].toString() : null,
			"min.cleanable.dirty.ratio": runtime_config.kafkaTopic['min.cleanable.dirty.ratio'] ? runtime_config.kafkaTopic['min.cleanable.dirty.ratio'].toString() : null,
			"index.interval.bytes": runtime_config.kafkaTopic['index.interval.bytes'] ? runtime_config.kafkaTopic['index.interval.bytes'].toString() : null,
			"unclean.leader.election.enable": runtime_config.kafkaTopic['unclean.leader.election.enable'] ? runtime_config.kafkaTopic['unclean.leader.election.enable'].toString() : null,
			"retention.bytes": runtime_config.kafkaTopic['retention.bytes'] ? runtime_config.kafkaTopic['retention.bytes'].toString() : null,
			"delete.retention.ms": runtime_config.kafkaTopic['delete.retention.ms'] ? runtime_config.kafkaTopic['delete.retention.ms'].toString() : null,
			"segment.ms": runtime_config.kafkaTopic['segment.ms'] ? runtime_config.kafkaTopic['segment.ms'].toString() : null,
			"message.timestamp.difference.max.ms": "9223372036854775807",
			// "message.timestamp.difference.max.ms": runtime_config.kafkaTopic['message.timestamp.difference.max.ms'] ? runtime_config.kafkaTopic['message.timestamp.difference.max.ms'].toString() : null,
			"segment.index.bytes": runtime_config.kafkaTopic['segment.index.bytes'] ? runtime_config.kafkaTopic['segment.index.bytes'].toString() : null
  }

  // Remove null vars
  Object.keys(config).forEach(key => {
    if (config[key] == null) {
      delete config[key];
    }
  });

  return sortObject(config)
}

function sortObject(obj) {
  return Object.keys(obj).sort().reduce(function (result, key) {
      result[key] = obj[key];
      return result;
  }, {});
}

function generate_hcl_json_msk(EP_CONFIG) {
  let tf = []
  var [operation, topic, app_name, alias, acl_principal] = "" 
  EP_CONFIG.applications.map(application => {
    app_name = application.application_name.replaceAll(" ", "-")
    acl_principal = application.acl_principal

    // Create resource for all consumed events
    application.consumedEventsVersions.map(consumedEventVersion =>{
      operation = "Read",
      topic = EP_CONFIG.events.filter(event => event.event_version_id == consumedEventVersion)[0].topic
      alias = `${app_name}_${operation}_${topic}`
      tf.push(format_tf_resource(operation, topic, alias, acl_principal))
    })

    // Create resource for all produced events
    application.producedEventsVersions.map(producedEventVersion =>{
      operation = "Write",
      topic = EP_CONFIG.events.filter(event => event.event_version_id == producedEventVersion)[0].topic
      alias = `${app_name}_${operation}_${topic}`
      tf.push(format_tf_resource(operation, topic, alias, acl_principal))
    })
  })
  fs.writeFile(`terraform-config/${EP_CONFIG.target_messaging_service.name}_acl_terraform_msk.tf.json`, JSON.stringify(tf, null, 2), (err) => {
    if (err) throw err;
   })
}

function format_tf_resource(operation, topic, alias, acl_principal) {
  return {
    "resource": {
      "kafka_acl": {
        [alias] : {
          "resource_name": topic,
          "resource_type": "Topic",
          "acl_principal": acl_principal,
          "acl_host": "*",
          "acl_operation": operation, 
          "acl_permission_type": "Allow"
        }
      }
    }
  }
}