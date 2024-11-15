state.var {
    user = state.map()
}

function add(id, address)
    -- assert(system.getSender() == system.getCreator(), "permission denied")
    -- if user[id] ~= nil then
    --     error("id already exists.")
    -- else
    --     user[id] = address
    -- end
    user[id] = address
end

function get(id)
    return user[id]
end

function update(id, new_address)
    if user[id] ~= nil then
        user[id] = new_address
    else
        error("id does not exist.")
    end
end

function delete(id)
    if user[id] ~= nil then
        user:delete(id)
    else
        error("id does not exist.")
    end
end

abi.register_view(get)
abi.register(add, update, delete)
