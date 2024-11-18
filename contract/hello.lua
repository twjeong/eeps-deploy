-- Define global state variables
state.var {
  Name = state.value(),
  My_map = state.map()
}

-- Initialize the state variables
function constructor()
  -- a constructor is called only once at the contract deployment
  Name:set("world")
  My_map["key"] = "value"
end

-- Update the name
-- @call
-- @param name          string: new name
function set_name(name)
  Name:set(name)
end

-- Say hello
-- @query
-- @return              string: 'hello ' + name
function hello()
  return "hello " .. Name:get()
end

-- register functions to expose
abi.register(set_name, hello)